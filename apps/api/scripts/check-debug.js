const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmployeeData() {
    const employeeEmail = 'ubaid.decojent@gmail.com'; // Admin user

    try {
        // 1. Find the User
        const user = await prisma.user.findUnique({
            where: { email: employeeEmail },
            include: { company: true, employee: true }
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User Company ID:', user.companyId);
        console.log('User Employee ID:', user.employeeId);

        if (!user.companyId) {
            console.log('User has no Company ID!');
            return;
        }

        // 2. Check Leave Types for this Company
        const leaveTypes = await prisma.leaveType.findMany({
            where: { companyId: user.companyId }
        });

        console.log(`Found ${leaveTypes.length} leave types for this company.`);
        leaveTypes.forEach(lt => console.log(` - ${lt.name} (Active: ${lt.isActive}, ID: ${lt.id})`));

        if (user.employee) {
            console.log('Employee Leave Balances:', JSON.stringify(user.employee.leaveBalances, null, 2));
        }

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkEmployeeData();
