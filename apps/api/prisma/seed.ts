import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create subscription plans
    const plans = await Promise.all([
        prisma.plan.upsert({
            where: { name: 'Starter' },
            update: {},
            create: {
                name: 'Starter',
                description: 'Perfect for small teams getting started',
                priceMonthly: 29,
                priceYearly: 290,
                maxEmployees: 25,
                maxDepartments: 5,
                hasGpsTracking: false,
                hasShiftManagement: false,
                hasAdvancedReports: false,
                hasApiAccess: false,
                hasWhiteLabel: false,
                hasCustomIntegrations: false,
                hasPrioritySupport: false,
                sortOrder: 1,
            },
        }),
        prisma.plan.upsert({
            where: { name: 'Professional' },
            update: {},
            create: {
                name: 'Professional',
                description: 'For growing companies with advanced needs',
                priceMonthly: 79,
                priceYearly: 790,
                maxEmployees: 100,
                maxDepartments: 20,
                hasGpsTracking: true,
                hasShiftManagement: true,
                hasAdvancedReports: true,
                hasApiAccess: true,
                hasWhiteLabel: false,
                hasCustomIntegrations: false,
                hasPrioritySupport: true,
                sortOrder: 2,
            },
        }),
        prisma.plan.upsert({
            where: { name: 'Enterprise' },
            update: {},
            create: {
                name: 'Enterprise',
                description: 'Unlimited power for large organizations',
                priceMonthly: 199,
                priceYearly: 1990,
                maxEmployees: -1, // Unlimited
                maxDepartments: -1,
                hasGpsTracking: true,
                hasShiftManagement: true,
                hasAdvancedReports: true,
                hasApiAccess: true,
                hasWhiteLabel: true,
                hasCustomIntegrations: true,
                hasPrioritySupport: true,
                sortOrder: 3,
            },
        }),
    ]);

    console.log(`✅ Created ${plans.length} subscription plans`);

    // Create demo company
    const demoCompany = await prisma.company.upsert({
        where: { slug: 'demo-company' },
        update: {},
        create: {
            name: 'Demo Company',
            slug: 'demo-company',
            email: 'admin@demo.com',
            phone: '+1234567890',
            address: '123 Business Street',
            city: 'San Francisco',
            state: 'CA',
            country: 'US',
            postalCode: '94102',
            timezone: 'America/Los_Angeles',
        },
    });

    console.log(`✅ Created demo company: ${demoCompany.name}`);

    // Create demo subscription
    const starterPlan = plans.find((p) => p.name === 'Starter');
    if (starterPlan) {
        await prisma.subscription.upsert({
            where: {
                companyId_planId: {
                    companyId: demoCompany.id,
                    planId: starterPlan.id,
                },
            },
            update: {},
            create: {
                companyId: demoCompany.id,
                planId: starterPlan.id,
                status: 'TRIALING',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            },
        });
    }

    // Create demo admin user
    const passwordHash = await bcrypt.hash('Demo@123!', 12);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@demo.com' },
        update: {},
        create: {
            companyId: demoCompany.id,
            email: 'admin@demo.com',
            passwordHash,
            firstName: 'Admin',
            lastName: 'User',
            role: 'COMPANY_ADMIN',
            status: 'ACTIVE',
            emailVerified: true,
        },
    });

    console.log(`✅ Created admin user: ${adminUser.email} (password: Demo@123!)`);

    // Create departments
    const departments = await Promise.all([
        prisma.department.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'ENG' } },
            update: {},
            create: { companyId: demoCompany.id, name: 'Engineering', code: 'ENG' },
        }),
        prisma.department.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'HR' } },
            update: {},
            create: { companyId: demoCompany.id, name: 'Human Resources', code: 'HR' },
        }),
        prisma.department.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'SALES' } },
            update: {},
            create: { companyId: demoCompany.id, name: 'Sales', code: 'SALES' },
        }),
        prisma.department.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'MKT' } },
            update: {},
            create: { companyId: demoCompany.id, name: 'Marketing', code: 'MKT' },
        }),
    ]);

    console.log(`✅ Created ${departments.length} departments`);

    // Create designations
    const designations = await Promise.all([
        prisma.designation.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'SE' } },
            update: {},
            create: { companyId: demoCompany.id, name: 'Software Engineer', code: 'SE', level: 2 },
        }),
        prisma.designation.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'SSE' } },
            update: {},
            create: { companyId: demoCompany.id, name: 'Senior Software Engineer', code: 'SSE', level: 3 },
        }),
        prisma.designation.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'TL' } },
            update: {},
            create: { companyId: demoCompany.id, name: 'Team Lead', code: 'TL', level: 4 },
        }),
        prisma.designation.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'MGR' } },
            update: {},
            create: { companyId: demoCompany.id, name: 'Manager', code: 'MGR', level: 5 },
        }),
    ]);

    console.log(`✅ Created ${designations.length} designations`);

    // Create default shift
    const defaultShift = await prisma.shift.upsert({
        where: { companyId_code: { companyId: demoCompany.id, code: 'GENERAL' } },
        update: {},
        create: {
            companyId: demoCompany.id,
            name: 'General Shift',
            code: 'GENERAL',
            startTime: '09:00',
            endTime: '18:00',
            breakDuration: 60,
            workingDays: [1, 2, 3, 4, 5],
            isDefault: true,
        },
    });

    console.log(`✅ Created default shift`);

    // Create leave types
    const leaveTypes = await Promise.all([
        prisma.leaveType.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'CL' } },
            update: {},
            create: {
                companyId: demoCompany.id,
                name: 'Casual Leave',
                code: 'CL',
                defaultDays: 12,
                color: '#10B981',
            },
        }),
        prisma.leaveType.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'SL' } },
            update: {},
            create: {
                companyId: demoCompany.id,
                name: 'Sick Leave',
                code: 'SL',
                defaultDays: 10,
                color: '#EF4444',
                requiresDocument: true,
            },
        }),
        prisma.leaveType.upsert({
            where: { companyId_code: { companyId: demoCompany.id, code: 'PL' } },
            update: {},
            create: {
                companyId: demoCompany.id,
                name: 'Annual Leave',
                code: 'AL',
                defaultDays: 15,
                color: '#3B82F6',
            },
        }),
    ]);

    console.log(`✅ Created ${leaveTypes.length} leave types`);

    // Create sample employees
    const engDept = departments.find(d => d.code === 'ENG');
    const seDes = designations.find(d => d.code === 'SE');

    const leaveBalances: Record<string, number> = {};
    leaveTypes.forEach(lt => {
        leaveBalances[lt.id] = lt.defaultDays;
    });

    const employee = await prisma.employee.upsert({
        where: { companyId_employeeCode: { companyId: demoCompany.id, employeeCode: 'EMP001' } },
        update: {},
        create: {
            companyId: demoCompany.id,
            employeeCode: 'EMP001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@demo.com',
            phone: '+1234567891',
            dateOfJoining: new Date('2024-01-15'),
            departmentId: engDept?.id,
            designationId: seDes?.id,
            shiftId: defaultShift.id,
            leaveBalances,
        },
    });

    // Create user for employee
    await prisma.user.upsert({
        where: { email: 'john.doe@demo.com' },
        update: {},
        create: {
            companyId: demoCompany.id,
            employeeId: employee.id,
            email: 'john.doe@demo.com',
            passwordHash,
            firstName: 'John',
            lastName: 'Doe',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            emailVerified: true,
        },
    });

    console.log(`✅ Created sample employee: ${employee.firstName} ${employee.lastName}`);

    // Create holidays for 2026
    const holidays2026 = [
        { name: 'New Year Day', date: '2026-01-01' },
        { name: 'Martin Luther King Jr. Day', date: '2026-01-19' },
        { name: 'Presidents Day', date: '2026-02-16' },
        { name: 'Memorial Day', date: '2026-05-25' },
        { name: 'Independence Day', date: '2026-07-04' },
        { name: 'Labor Day', date: '2026-09-07' },
        { name: 'Thanksgiving Day', date: '2026-11-26' },
        { name: 'Christmas Day', date: '2026-12-25' },
    ];

    for (const holiday of holidays2026) {
        await prisma.holiday.upsert({
            where: {
                companyId_date: {
                    companyId: demoCompany.id,
                    date: new Date(holiday.date),
                },
            },
            update: {},
            create: {
                companyId: demoCompany.id,
                name: holiday.name,
                date: new Date(holiday.date),
                type: 'NATIONAL',
            },
        });
    }

    console.log(`✅ Created ${holidays2026.length} holidays for 2026`);

    console.log('\n🎉 Database seed completed successfully!\n');
    console.log('Demo Credentials:');
    console.log('  Admin: admin@demo.com / Demo@123!');
    console.log('  Employee: john.doe@demo.com / Demo@123!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
