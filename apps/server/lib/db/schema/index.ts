import { date, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

type Genre = "Fiction" | "Non-Fiction" | "Science Fiction" | "Fantasy" | "Biography" | "History" | "Children's";
type Status = "active" | "returned" | "overdue";

const book = pgTable("book", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    genre: text().$type<Genre>().notNull(),
    publication_year: integer("publication_year").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
});

const loan = pgTable("loan", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    book_id: text("book_id").notNull().references(() => book.id).references(() => book.id, { onDelete: "cascade" }),
    user_id: text("user_id").notNull().references(() => user.id).references(() => user.id, { onDelete: "cascade" }),
    checkout_date: date("checkout_date").notNull().defaultNow(),
    due_date: date("due_date").notNull(),
    status: text("status").$type<Status>().notNull(), // e.g., "Checked Out", "Returned", "Overdue"
    returned_at: date("returned_at"),
});

type Book = typeof book.$inferSelect;
type Loan = typeof loan.$inferSelect;
type User = typeof user.$inferSelect;

export { book, loan };
export * from "./auth-schema";

export type { Genre, Status, Book, Loan, User };