import { createWriteStream, existsSync } from "fs";
import { stat, readdir, unlink, rm, mkdir } from "fs/promises";
import { exec } from "child_process";
import { extname, join, parse, sep } from "path";
import PDFDocument from "pdfkit";
import sizeOf from "image-size";

async function extractVideoFilesRecursively(folderPath) {
    try {
        const files = await readdir(folderPath);
        const videoFilesMap = {};
        for (const file of files) {
            const filePath = join(folderPath, file);
            const fileStats = await stat(filePath);
            if (fileStats.isDirectory()) {
                Object.assign(videoFilesMap, await extractVideoFilesRecursively(filePath));
            } else {
                const fileExt = extname(file).toLowerCase();
                if ([".mp4", ".avi", ".mov", ".mkv"].includes(fileExt)) {
                    videoFilesMap[folderPath] = videoFilesMap[folderPath] || [];
                    videoFilesMap[folderPath].push(file);
                }
            }
        }
        return videoFilesMap;
    } catch (error) {
        console.error("Error extracting video files:", error.message);
        throw error;
    }
}

async function convertVideoToImages(videoFilePath, imagesDir, framesPerSecond) {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i "${videoFilePath}" -vf fps=${framesPerSecond} "${imagesDir}/%10d.png"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error converting video to images: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                if (!stderr.includes("muxing overhead: unknown")) {
                    console.error(`stderr: ${stderr}`);
                    return reject(new Error(stderr));
                }
            }
            resolve(true);
        });
    });
}

async function generatePDFFromImages(imagesDir, pdfPath) {
    try {
        const imageFiles = await readdir(imagesDir);
        if (imageFiles?.length > 0) {
            const imageSize = sizeOf(join(imagesDir, imageFiles[0]));
            const doc = new PDFDocument({
                size: [imageSize.width, imageSize.height],
                autoFirstPage: false,
            });
            imageFiles.forEach((imageFile) => {
                doc.addPage().image(`${imagesDir}/${imageFile}`, 0, 0, { width: imageSize.width, height: imageSize.height });
            });

            const stream = createWriteStream(pdfPath);
            doc.pipe(stream);
            doc.end();

            await new Promise((resolve, reject) => {
                stream.on("finish", () => {
                    console.log(`PDF generated for images in directory: ${pdfPath}`);
                    resolve(true);
                });

                stream.on("error", (error) => {
                    console.error(`Error generating PDF for images in directory: ${pdfPath}: ${error.message}`);
                    reject(error);
                });
            });
        } else {
            console.log(`PDF is not generated as images count is zero for ${imagesDir}`);
        }
    } catch (error) {
        console.error("Error generating PDF:", error.message);
        throw error;
    }
}

async function convertVideoToPdfDocument(videoFilePath, imagesDir, pdfPath, framesPerSecond) {
    try {
        await convertVideoToImages(videoFilePath, imagesDir, framesPerSecond);
        await generatePDFFromImages(imagesDir, pdfPath);
        unlink(videoFilePath);
        rm(imagesDir, { recursive: true });
        return true;
    } catch (error) {
        console.error("Error converting video to PDF:", error.message);
        throw error;
    }
}

async function getImagesDirectory(imagesRootFolderName, videosDir, videoName) {
    try {
        const { name } = parse(videoName);
        const dirs = videosDir.split(sep).slice(1); // Avoiding the root folder
        const imagesDir = join(imagesRootFolderName, ...dirs, name);
        await mkdir(imagesDir, { recursive: true });
        return imagesDir;
    } catch (error) {
        console.error("Error getting images directory:", error.message);
        throw error;
    }
}

async function getPDFPath(pdfsRootFolderName, videosDir, videoName) {
    try {
        const { name } = parse(videoName);
        const dirs = videosDir.split(sep).slice(1); // Avoiding the root folder
        const pdfDir = join(pdfsRootFolderName, ...dirs);
        await mkdir(pdfDir, { recursive: true });
        return join(pdfDir, `${name}.pdf`);
    } catch (error) {
        console.error("Error getting PDF path:", error.message);
        throw error;
    }
}

async function processVideosToPdfDocumentsForEachDirectory(videosDir, videoNames, imagesRootFolderName, pdfsRootFolderName, framesPerSecond, numberOfVideosProcessAtATime) {
    try {
        const videosChunks = [];
        for (let i = 0; i < videoNames.length; i += numberOfVideosProcessAtATime) {
            videosChunks.push(videoNames.slice(i, i + numberOfVideosProcessAtATime));
        }
        for (const videosChunk of videosChunks) {
            console.log("\n");
            const promises = [];
            for (let i = 0; i < videosChunk.length; i++) {
                const videoName = videosChunk[i];
                const videoFilePath = join(videosDir, videoName);
                const imagesDir = await getImagesDirectory(imagesRootFolderName, videosDir, videoName);
                const pdfPath = await getPDFPath(pdfsRootFolderName, videosDir, videoName);
                console.log(`Started extracting images for video: ${videoFilePath}`);
                promises.push(convertVideoToPdfDocument(videoFilePath, imagesDir, pdfPath, framesPerSecond));
            }
            console.log("");
            const results = await Promise.allSettled(promises);

            for (let i = 0; i < videosChunk.length; i++) {
                const videoName = videosChunk[i];
                const videoPath = join(videosDir, videoName);
                if (results[i].status === "rejected") {
                    console.log(`******************Error occurred while converting ${videoPath} to PDF******************`);
                }
            }
        }
    } catch (error) {
        console.error("Error processing videos to PDF documents:", error.message);
        throw error;
    }
}

async function processVideosToPdf(videosRootFolderName, imagesRootFolderName, pdfsRootFolderName, framesPerSecond, numberOfVideosProcessAtATime) {
    try {
        const videoFilesMap = await extractVideoFilesRecursively(videosRootFolderName);

        if (Object.keys(videoFilesMap).length === 0) {
            console.log(`No video files found in ${videosRootFolderName} folder`);
            return;
        }

        for (const [videosDir, videoNames] of Object.entries(videoFilesMap)) {
            console.log("\n\n------------------------------------------------------------------------------------");
            console.log(`Started converting videos to PDFs for ${videosDir}`);
            console.log("------------------------------------------------------------------------------------");
            await processVideosToPdfDocumentsForEachDirectory(videosDir, videoNames, imagesRootFolderName, pdfsRootFolderName, framesPerSecond, numberOfVideosProcessAtATime);
            rm(videosDir, { recursive: true });
            console.log("------------------------------------------------------------------------------------");
            console.log(`Completed converting videos to PDFs for ${videosDir}`);
            console.log("------------------------------------------------------------------------------------");
        }
    } catch (error) {
        console.error("Error processing videos to PDF:", error.message);
        throw error;
    }
}


async function main() {
    const videosRootFolderName = "temp";
    const imagesRootFolderName = "images";
    const pdfsRootFolderName = "pdfs";
    const framesPerSecond = "1/60";
    const numberOfVideosProcessAtATime = 20;
    try {
        await processVideosToPdf(videosRootFolderName, imagesRootFolderName, pdfsRootFolderName, framesPerSecond, numberOfVideosProcessAtATime);
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        if (existsSync(imagesRootFolderName)) {
            await rm(imagesRootFolderName, { recursive: true });
        }
    }
}

main();
