import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth-schema";

type Genre = "Fiction" | "Non-Fiction" | "Science Fiction" | "Fantasy" | "Biography" | "History" | "Children's";
type Status = "active" | "returned" | "overdue";

const book = pgTable("book", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    genre: text().$type<Genre>().notNull(),
    publication_year: integer("publication_year").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
});

const loan = pgTable("loan", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    book_id: text("book_id").notNull().references(() => book.id, { onDelete: "cascade" }),
    user_id: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    checkout_date: timestamp("checkout_date", { mode: "date" }).notNull().defaultNow(),
    due_date: timestamp("due_date", { mode: "date" }).notNull(),
    status: text("status").$type<Status>().notNull(), // e.g., "Checked Out", "Returned", "Overdue"
    returned_at: timestamp("returned_at", { mode: "date" }),
}, (table) => [
    uniqueIndex("loan_active_book_unique").on(table.book_id).where(sql`${table.status} = 'active'`),
]);

type Book = typeof book.$inferSelect;
type Loan = typeof loan.$inferSelect;
type User = typeof user.$inferSelect;

export { book, loan };
export * from "./auth-schema";

export type { Genre, Status, Book, Loan, User };