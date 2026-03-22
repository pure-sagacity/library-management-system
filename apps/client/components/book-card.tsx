import type { Genre } from "@library-management-system/server";
import Link from "next/link";

interface Props {
    book: {
        id: string;
        title: string;
        genre: Genre;
        publication_year: number;
        created_at: Date;
    };
}

export default function BookCard({ book }: Props) {
    return (
        <Link href={`/book/${book.id}`} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold">{book.title}</h3>
            <p className="text-sm text-muted-foreground">{book.genre} - {book.publication_year}</p>
        </Link>
    );
}