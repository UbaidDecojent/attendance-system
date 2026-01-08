const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteCompany(companyName) {
    const company = await prisma.company.findFirst({
        where: { name: companyName }
    });

    if (!company) {
        console.log(`Company "${companyName}" not found`);
        return;
    }

    console.log(`Found company: ${company.name} (${company.id})`);

    // Delete in order due to foreign key constraints
    await prisma.refreshToken.deleteMany({ where: { user: { companyId: company.id } } });
    await prisma.user.deleteMany({ where: { companyId: company.id } });
    await prisma.subscription.deleteMany({ where: { companyId: company.id } });
    await prisma.leaveType.deleteMany({ where: { companyId: company.id } });
    await prisma.shift.deleteMany({ where: { companyId: company.id } });
    await prisma.department.deleteMany({ where: { companyId: company.id } });
    await prisma.designation.deleteMany({ where: { companyId: company.id } });
    await prisma.holiday.deleteMany({ where: { companyId: company.id } });
    await prisma.company.delete({ where: { id: company.id } });

    console.log(`Successfully deleted company: ${companyName}`);
}

deleteCompany('Decojent')
    .catch(console.error)
    .finally(() => prisma.$disconnect());
