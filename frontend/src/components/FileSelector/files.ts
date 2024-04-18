import JSZip from "jszip";
import { PDFDocument } from 'pdf-lib';
import { IBook } from "../BookCard";

type EpubData = { 
    title: string; 
    author: string; 
    publisher: string 
} | null;

export async function fetchEpubData(zip: JSZip): Promise<EpubData>
{    
    let packageOpf: JSZip.JSZipObject | null = null;

    zip.forEach(zipEntry => 
    {
        if (zipEntry.endsWith('.opf') && !packageOpf) 
            packageOpf = zip.file(zipEntry);
    });

    if (!packageOpf) return null;

    const parser = new DOMParser();
    const packageXmlString = await (packageOpf as JSZip.JSZipObject).async("text");
    const packageXml = parser.parseFromString(packageXmlString, "text/xml");

    const metadata = packageXml.querySelector("metadata");
    if (!metadata) return null;

    const title = metadata.querySelector("title")?.textContent || '';
    const author = metadata.querySelector("creator")?.textContent || '';
    const publisher = metadata.querySelector("publisher")?.textContent || '';

    return { title, author, publisher };
}

interface FileData 
{ 
    bookFile: string; 
    fileType: string; 
    setBook: React.Dispatch<React.SetStateAction<IBook>>; 
    setOriginalCover: React.Dispatch<React.SetStateAction<string | null>>;
}

export async function setFileData({ bookFile, fileType, setBook, setOriginalCover }: FileData)
{
    // Nested to re-use 'book' and 'setBook' w/o needing to pass as params again.
    // Afaik, it's passed as reference anyway, but having another interface would
    // clutter things.
    async function setBookData(zip: JSZip, bookCover: string | null = null)
    {
        try
        {
            const epubData = await fetchEpubData(zip);
            if (!epubData) throw new Error("Failed to load EPUB data."); 
            
            const { title, author, publisher } = epubData;
            
            // Everything *needs* to be set at once, or else it'll only set the last one you do.
            // Something something 'book' not having updated because it's asynchronous.
            setBook(currBook => ({
                ...currBook,
                ['title']: title,
                ['author']: author,
                ['publisher']: publisher,
                ['attachment']: bookFile,
                ['cover']: bookCover
            }));
        } 
        catch (error) 
        {
            console.error("Error fetching EPUB data:", error);
        }
    }

    if (fileType.includes("epub"))
    {   
        const base64WithoutPrefix = bookFile.replace(/^data:application\/epub\+zip;base64,/, '');
        const binaryData = Uint8Array.from(atob(base64WithoutPrefix), c => c.charCodeAt(0));
        JSZip().loadAsync(binaryData).then(async zip =>
        {
            const regularCoverPath = zip.file("OEBPS/Text/cover.xhtml");
            if (regularCoverPath) 
            {
                const fileContent = await regularCoverPath.async("string");
                const document = new DOMParser().parseFromString(fileContent, "text/html");
                const elements = document.querySelectorAll('img[src$=".png"], img[src$=".jpg"], div[src$=".png"], div[src$=".jpg"]');
                const imageSrc = elements[0].getAttribute("src")!.replace('..', 'OEBPS'); // It comes as a relative path.
                const imageFormat = imageSrc.split('.').pop();
                const imageCover = zip.file(imageSrc); 
                const imageData = await imageCover!.async("uint8array");
                const binaryCover = imageData.reduce((data, byte) => data + String.fromCharCode(byte), '');
                const base64Cover = `data:image/${imageFormat};base64,${btoa(binaryCover)}`;
                setOriginalCover(base64Cover);
                setBookData(zip, base64Cover);
                return;
            } 

            const irregularPath = Object.keys(zip.files).filter(filename => filename.toLowerCase().includes('cover'))[0];
            if (irregularPath)
            {
                const imageCover = zip.file(irregularPath);
                const imageFormat = irregularPath.split('.').pop();
                const imageData = await imageCover?.async("uint8array");
                const binaryCover = imageData!.reduce((data, byte) => data + String.fromCharCode(byte), '');
                const base64Cover = `data:image/${imageFormat};base64,${btoa(binaryCover)}`;
                setOriginalCover(base64Cover);
                setBookData(zip, base64Cover);
                return;
            }

            setBookData(zip);
        });    
    }
    else if (fileType.includes("pdf"))
    {
        const pdfDoc = await PDFDocument.load(bookFile, { 
            updateMetadata: false 
        });
            
        const title = pdfDoc.getTitle() || '';
        const author = pdfDoc.getAuthor() || '';
        const publisher = pdfDoc.getProducer() || '';

        setBook(currBook => ({
            ...currBook,
            ['title']: title,
            ['author']: author,
            ['publisher']: publisher,
            ['attachment']: bookFile
        }));
    }
    else // .png or .jpg
    {
        setOriginalCover(bookFile);
        setBook(currBook => ({
            ...currBook, 
            ['cover']: bookFile 
        }));
    }
}