const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('--- Checking Attendance Records ---');
        const count = await prisma.attendanceRecord.count();
        console.log(`Total Records: ${count}`);

        const records = await prisma.attendanceRecord.findMany({
            orderBy: { date: 'desc' },
            take: 10,
            include: { employee: true }
        });

        if (records.length === 0) {
            console.log('No attendance records found.');
        } else {
            records.forEach(r => {
                console.log(`[${r.date.toISOString().split('T')[0]}] Emp: ${r.employee?.firstName} | In: ${r.checkInTime ? r.checkInTime.toISOString() : 'N/A'} | Out: ${r.checkOutTime ? r.checkOutTime.toISOString() : 'N/A'} | Status: ${r.status}`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
