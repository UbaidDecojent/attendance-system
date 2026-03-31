import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = '93afd601-1df2-43eb-a656-6e8f35c221f5';
    console.log('Checking user:', userId);

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.companyId) {
        console.log('User or CompanyId not found');
        return;
    }

    console.log('User found:', user.email);
    console.log('User Role:', user.role); // Log role
    console.log('CompanyId:', user.companyId);

    const employeeCount = await prisma.employee.count({
        where: { companyId: user.companyId }
    });

    console.log('Total Employees in Company:', employeeCount);

    // Check findMany result directly
    const employees = await prisma.employee.findMany({
        where: { companyId: user.companyId },
        take: 5
    });
    console.log('Sample Employees:', employees.length, employees.map(e => ({ id: e.id, name: e.firstName, isActive: e.isActive })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
