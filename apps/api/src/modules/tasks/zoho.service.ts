import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import { format, parse, startOfDay, endOfDay, isWeekend, eachDayOfInterval, isAfter, isBefore, isValid } from 'date-fns';

interface ZohoUser {
    id: string; // usually long numeric string
    name: string;
    email: string;
    photo_url: string;
    role_name: string;
}

interface ZohoTask {
    id_string: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string; // 'MM-dd-yyyy'
    work_hours: string; // '08:00'
    duration: string;
    duration_type?: string;
    start_date_long?: number;
    end_date_long?: number;
    due_date?: string;
    status: { name: string; type?: string };
    billing_type: string;
    details: {
        owners: { id: string; name: string }[];
    };
    project: { id: string; name: string };
    created_time?: string;
    last_updated_time?: string;
    billingtype?: string;
}

interface ZohoTimeLog {
    id_string: string;
    date: string; // 'MM-dd-yyyy'
    hours: string; // '04:30'
    hours_display: string;
    owner_id: string;
    notes: string;
    bill_status: string;
    task: { id_string: string; name: string };
    project: { id_string: string; name: string };
}

@Injectable()
export class ZohoService {
    private readonly logger = new Logger(ZohoService.name);
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    // Cache to solve Rate Limiting (100 req/2min) and Slow Performance
    private tasksCache = new Map<string, { data: ZohoTask[], timestamp: number }>();
    private logsCache = new Map<string, { data: any[], timestamp: number }>();
    private CACHE_TTL = 300 * 1000; // 5 minutes

    // Use environment variables directly
    private get clientId() { return process.env.ZOHO_CLIENT_ID; }
    private get clientSecret() { return process.env.ZOHO_CLIENT_SECRET; }
    private get refreshToken() { return process.env.ZOHO_REFRESH_TOKEN; }
    private get portalId() { return process.env.ZOHO_PORTAL_ID; }

    async getWorkload(startDateStr: string, endDateStr: string) {
        // Pre-fetch token to avoid concurrency race conditions in parallel batches
        await this.getAccessToken();

        if (!this.clientId || !this.clientSecret || !this.refreshToken || !this.portalId) {
            this.logger.warn('Zoho Integration credentials missing');
            return [];
        }

        const start = startOfDay(parse(startDateStr, 'yyyy-MM-dd', new Date()));
        const end = endOfDay(parse(endDateStr, 'yyyy-MM-dd', new Date()));
        const logFile = 'd:/attendance/apps/api/zoho_debug.log';
        const startStr = format(start, 'MM-dd-yyyy');

        fs.writeFileSync(logFile, `[${new Date().toISOString()}] Starting Refresh with Caching\n`);

        // 1. Fetch Users
        const usersRes = await this.fetch<{ users: ZohoUser[] }>('users');
        const users = usersRes?.users || [];
        fs.appendFileSync(logFile, `[SUCCESS] Fetched ${users.length} users\n`);

        const employeesMap = new Map<string, any>();
        users.forEach(u => {
            employeesMap.set(u.id, {
                id: u.id,
                name: u.name,
                role: u.role_name,
                designation: u.role_name,
                capacity: 8,
                workload: {},
                tasks: []
            });
        });

        // 2. Fetch Active Projects
        const projectsRes = await this.fetch<{ projects: { id_string: string; name: string }[] }>('projects', { status: 'active' });
        const projects = projectsRes?.projects || [];
        fs.appendFileSync(logFile, `[SUCCESS] Fetched ${projects.length} projects\n`);

        // 3. Batched Parallel Fetch with Caching
        const results = [];
        const BATCH_SIZE = 5;

        for (let i = 0; i < projects.length; i += BATCH_SIZE) {
            const batch = projects.slice(i, i + BATCH_SIZE);

            if (i > 0) await new Promise(r => setTimeout(r, 500)); // Rate limit buffer

            const batchResults = await Promise.all(batch.map(async (p) => {
                const pId = p.id_string;

                // -- Tasks with Cache --
                let tasks: ZohoTask[] = [];
                const tCacheKey = `tasks_${pId}`;
                const tCached = this.tasksCache.get(tCacheKey);

                if (tCached && (Date.now() - tCached.timestamp < this.CACHE_TTL)) {
                    tasks = tCached.data;
                    fs.appendFileSync(logFile, `[CACHE] Project ${p.name}: Shared Tasks Cache Used\n`);
                } else {
                    const tasksRes = await this.fetch<{ tasks: ZohoTask[] }>(`projects/${pId}/tasks`, { range: 50 });
                    if (tasksRes?.tasks) {
                        tasks = tasksRes.tasks;
                        this.tasksCache.set(tCacheKey, { data: tasks, timestamp: Date.now() });
                    } else if (tCached) {
                        tasks = tCached.data; // Fallback to stale on failure
                        fs.appendFileSync(logFile, `[WARN] Project ${p.name}: Tasks fetch failed/limited, using stale cache.\n`);
                    }
                }

                // -- Logs with Cache --
                let logs: any[] = [];
                const lCacheKey = `logs_${pId}_${startStr}`;
                const lCached = this.logsCache.get(lCacheKey);

                if (lCached && (Date.now() - lCached.timestamp < this.CACHE_TTL)) {
                    logs = lCached.data;
                    fs.appendFileSync(logFile, `[CACHE] Project ${p.name}: Shared Logs Cache Used\n`);
                } else {
                    const logsRes = await this.fetch<any>(`projects/${pId}/logs`, {
                        view_type: 'week',
                        date: startStr,
                        bill_status: 'All',
                        component_type: 'task',
                        users_list: 'all'
                    });

                    let fetchedLogs: any[] = [];
                    if (logsRes && logsRes.timelogs) {
                        if (logsRes.timelogs.date && Array.isArray(logsRes.timelogs.date)) {
                            fetchedLogs = logsRes.timelogs.date.flatMap((d: any) =>
                                (d.tasklogs || []).map((tl: any) => ({ ...tl, date: d.date }))
                            );
                        } else if (Array.isArray(logsRes.timelogs)) {
                            fetchedLogs = logsRes.timelogs;
                        }
                        this.logsCache.set(lCacheKey, { data: fetchedLogs, timestamp: Date.now() });
                        logs = fetchedLogs;
                    } else if (lCached) {
                        logs = lCached.data; // Fallback to stale on failure
                        fs.appendFileSync(logFile, `[WARN] Project ${p.name}: Logs fetch failed/limited, using stale cache.\n`);
                    }
                }

                return { projectId: pId, tasks, logs };
            }));
            results.push(...batchResults);
        }

        // 4. Process Results
        for (const { tasks, logs, projectId } of results) {
            try {
                const project = projects.find(p => p.id_string === projectId);
                const projectName = project?.name || 'Unknown Project';

                // -- Process Tasks --
                for (const task of tasks) {
                    // Normalize properties
                    const zStart = task.start_date || (task as any).start_date_long;
                    const zEnd = task.end_date || (task as any).due_date || (task as any).end_date_long;

                    if (!zStart || !zEnd) continue;

                    let tStart;
                    let tEnd;

                    if (String(zStart).includes('-')) tStart = parse(zStart, 'MM-dd-yyyy', new Date());
                    else tStart = new Date(Number(zStart));

                    if (String(zEnd).includes('-')) tEnd = parse(zEnd, 'MM-dd-yyyy', new Date());
                    else tEnd = new Date(Number(zEnd));

                    if (!isValid(tStart) || !isValid(tEnd)) continue;
                    if (isAfter(tStart, tEnd)) continue;

                    // Calculate Hours
                    let estimatedHours = 0;
                    if (task.work_hours) {
                        const parts = task.work_hours.split(':').map(Number);
                        if (parts.length === 2) estimatedHours = parts[0] + (parts[1] / 60);
                        else estimatedHours = parseFloat(task.work_hours);
                    } else if (task.duration) {
                        const dVal = parseFloat(task.duration);
                        if (task.duration_type === 'days') estimatedHours = dVal * 8;
                        else if (task.duration_type === 'hours') estimatedHours = dVal;
                    }

                    const daysInInterval = eachDayOfInterval({ start: tStart, end: tEnd });
                    const businessDays = daysInInterval.filter(d => !isWeekend(d)).length;
                    let dailyHours = (businessDays > 0 && estimatedHours > 0) ? (estimatedHours / businessDays) : 0;

                    if (dailyHours === 0) dailyHours = 1;

                    // Assign to Owners
                    const owners = task.details?.owners || [];
                    for (const owner of owners) {
                        const emp = employeesMap.get(owner.id);
                        if (!emp) continue;

                        const existingTask = emp.tasks.find((t: any) => t.id === task.id_string);
                        if (!existingTask) {
                            emp.tasks.push({
                                id: task.id_string,
                                name: task.name,
                                project: projectName,
                                startDate: format(tStart, 'yyyy-MM-dd'),
                                dueDate: format(tEnd, 'yyyy-MM-dd'),
                                estimatedHours: estimatedHours,
                                dailyHours: dailyHours,
                                dailyAllocatedHours: dailyHours,
                                dailyLoggedHours: {},
                                status: task.status?.name || 'Unknown',
                                billingType: task.billingtype || 'Unknown'
                            });
                        }

                        // Distribute Workload
                        const distributionStart = isAfter(tStart, start) ? tStart : start;
                        const distributionEnd = isBefore(tEnd, end) ? tEnd : end;

                        if (!isAfter(distributionStart, distributionEnd)) {
                            const distDays = eachDayOfInterval({ start: distributionStart, end: distributionEnd });
                            for (const day of distDays) {
                                if (isWeekend(day)) continue;
                                const dKey = format(day, 'yyyy-MM-dd');
                                emp.workload[dKey] = (emp.workload[dKey] || 0) + dailyHours;
                            }
                        }
                    }
                }

                // -- Process Logs --
                for (const log of logs) {
                    const emp = employeesMap.get(log.owner_id);
                    if (!emp) continue;

                    const lDate = parse(log.date, 'MM-dd-yyyy', new Date());
                    if (!isValid(lDate)) continue;

                    const dateKey = format(lDate, 'yyyy-MM-dd');
                    const [lh, lm] = (log.hours_display || log.hours || '0:0').split(':').map(Number);
                    const duration = lh + (lm / 60);

                    const task = emp.tasks.find((t: any) => t.id === log.task.id_string);
                    if (task) {
                        task.dailyLoggedHours[dateKey] = (task.dailyLoggedHours[dateKey] || 0) + duration;
                    }
                }

            } catch (err: any) {
                fs.appendFileSync(logFile, `[CRITICAL ERROR] Processing Project ${projectId} failed: ${err.message}\n${err.stack}\n`);
            }
        }

        return Array.from(employeesMap.values());
    }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken!;

        try {
            const url = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${this.refreshToken}&client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=refresh_token`;
            const { data } = await axios.post(url);

            if (data.error) throw new Error(JSON.stringify(data));

            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (3500 * 1000);
            return this.accessToken!;
        } catch (e) {
            this.logger.error('Token Refresh Failed', e);
            throw e;
        }
    }

    private async fetch<T>(endpoint: string, params: any = {}): Promise<T | null> {
        try {
            const token = await this.getAccessToken();
            const url = `https://projectsapi.zoho.com/restapi/portal/${this.portalId}/${endpoint}/`;
            const { data } = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            return data;
        } catch (error) {
            const msg = axios.isAxiosError(error) ? error.response?.data : error.message;
            const url = `https://projectsapi.zoho.com/restapi/portal/${this.portalId}/${endpoint}/`;
            try {
                const fullUrl = axios.getUri({ url, params });
                fs.appendFileSync('d:/attendance/apps/api/zoho_debug.log', `API Error [${fullUrl}]: ${JSON.stringify(msg)}\n`);
            } catch (e) {
                fs.appendFileSync('d:/attendance/apps/api/zoho_debug.log', `API Error [${url}]: ${JSON.stringify(msg)}\n`);
            }
            return null;
        }
    }
}
