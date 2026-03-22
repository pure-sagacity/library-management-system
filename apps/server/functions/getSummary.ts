import { logger } from "@/lib/logger";

async function fetchFromOpenLibrary(title: string, author: string) {
    const query = new URLSearchParams({ title, author, limit: "1", fields: "key,title,author_name" });
    const searchRes = await fetch(`https://openlibrary.org/search.json?${query}`);
    const searchData = await searchRes.json();

    const work = searchData.docs?.[0];
    if (!work?.key) return null;

    const workRes = await fetch(`https://openlibrary.org${work.key}.json`);
    const workData = await workRes.json();

    const description = workData.description;
    if (!description) return null;

    return typeof description === "string" ? description : description.value ?? null;
}

async function fetchFromGoogleBooks(title: string, author: string) {
    const q = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
    const data = await res.json();

    return data.items?.[0]?.volumeInfo?.description ?? null;
}

async function getBookSummary(title: string, author: string) {
    console.log(`\nFetching summary for: "${title}" by ${author}`);

    // 1. Try Open Library
    try {
        const summary = await fetchFromOpenLibrary(title, author);
        if (summary) {
            console.log("✅ Source: Open Library");
            return { source: "Open Library", summary };
        }
        logger.warn(`Open Library: no description found for "${title}" by ${author}.`);
    } catch (err) {
        logger.warn(`Open Library fetch failed for "${title}" by ${author}: ${err}`);
    }

    // 2. Try Google Books
    try {
        const summary = await fetchFromGoogleBooks(title, author);
        if (summary) {
            logger.info
            return { source: "Google Books", summary };
        }
        logger.warn(`Google Books: no description found for "${title}" by ${author}.`);
    } catch (err) {
        logger.warn(`Google Books fetch failed for "${title}" by ${author}: ${err}`);
    }

    logger.warn(`No summary found for "${title}" by ${author} from either source.`);
    return { source: null, summary: null };
}

export default getBookSummary;
export { getBookSummary, fetchFromGoogleBooks, fetchFromOpenLibrary };