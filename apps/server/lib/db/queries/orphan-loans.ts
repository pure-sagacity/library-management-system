import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { book as bookTable, loan } from '@/lib/db/schema';

type CleanupOrphanLoansResult = {
    deletedCount: number;
    deletedLoanIds: string[];
};

const cleanupOrphanLoans = async (): Promise<CleanupOrphanLoansResult> => {
    const orphanRows = await db
        .select({ id: loan.id })
        .from(loan)
        .leftJoin(bookTable, eq(loan.book_id, bookTable.id))
        .where(isNull(bookTable.id));

    if (orphanRows.length === 0) {
        return {
            deletedCount: 0,
            deletedLoanIds: [],
        };
    }

    const orphanLoanIds = orphanRows.map((row) => row.id);

    const deletedRows = await db
        .delete(loan)
        .where(inArray(loan.id, orphanLoanIds))
        .returning({ id: loan.id });

    return {
        deletedCount: deletedRows.length,
        deletedLoanIds: deletedRows.map((row) => row.id),
    };
};

export { cleanupOrphanLoans };
export type { CleanupOrphanLoansResult };