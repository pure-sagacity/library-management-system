import { logger } from "@/lib/logger";

async function fetchFromOpenLibrary(title: string, author?: string) {
    const query = new URLSearchParams({
        title,
        limit: "1",
        fields: "key,title,author_name",
    });
    if (author && author.trim().length > 0) {
        query.set("author", author);
    }
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

async function fetchFromGoogleBooks(title: string, author?: string) {
    const authorSegment = author && author.trim().length > 0
        ? `+inauthor:${encodeURIComponent(author)}`
        : "";
    const q = `intitle:${encodeURIComponent(title)}${authorSegment}`;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
    const data = await res.json();

    return data.items?.[0]?.volumeInfo?.description ?? null;
}

async function getBookSummary(title: string, author?: string) {

    // 1. Try Open Library
    try {
        const summary = await fetchFromOpenLibrary(title, author);
        if (summary) {
            logger.info({ title, source: "Open Library" }, "summary.lookup.success");
            return { source: "Open Library", summary };
        }
        logger.warn(`Open Library: no description found for "${title}".`);
    } catch (err) {
        logger.warn(`Open Library fetch failed for "${title}": ${err}`);
    }

    // 2. Try Google Books
    try {
        const summary = await fetchFromGoogleBooks(title, author);
        if (summary) {
            logger.info({ title, source: "Google Books" }, "summary.lookup.success");
            return { source: "Google Books", summary };
        }
        logger.warn(`Google Books: no description found for "${title}".`);
    } catch (err) {
        logger.warn(`Google Books fetch failed for "${title}": ${err}`);
    }

    logger.warn(`No summary found for "${title}" from either source.`);
    return { source: null, summary: null };
}

export default getBookSummary;
export { getBookSummary, fetchFromGoogleBooks, fetchFromOpenLibrary };