const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'test@gmail.com' },
        include: {
            employee: {
                include: {
                    department: true
                }
            }
        }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User:', user.email);
    if (user.employee) {
        console.log('Employee ID:', user.employee.id);
        console.log('Department:', user.employee.department ? user.employee.department.name : 'NONE');
        console.log('Department ID:', user.employee.departmentId);
    } else {
        console.log('No employee record linked.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
