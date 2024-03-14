# Video to PDF Converter

This project is a command-line tool written in Node.js for bulk converting video files to PDF documents. It utilizes FFmpeg for video processing and PDFKit for generating PDF documents from images extracted from videos.

## Features

- Bulk convert multiple video formats (e.g., MP4, AVI, MOV, MKV) to PDF documents.
- Configurable frames per second (FPS) for image extraction.
- Process multiple videos simultaneously.
- Automatically generate images from videos and compile them into PDF documents.
- Simple command-line interface for easy usage.
- Automatic cleanup of temporary files after completion.

## Installation

1. Ensure you have Node.js installed on your system.
2. Clone this repository to your local machine.
3. Run `npm install` to install project dependencies.

## Usage

1. Place your video files in the designated directory (default: `temp`).
2. Run the command `node index.js` to start the bulk conversion process.
3. Converted PDF files will be saved in the `pdfs` directory.
4. Clean up temporary files by deleting the `temp` and `images` directories.

### Configuration

- Adjust the frames per second (FPS) for image extraction in `index.js`.
- Modify the number of videos processed simultaneously by changing `numberOfVideosProcessAtATime`.

## Bulk Conversion

The tool is capable of bulk converting multiple videos at once. It processes all the videos available in the `temp` directory and converts them to PDF documents.

## Failure Handling

In case of a failure during conversion, the script logs the error and proceeds to the next video. The temporary files are not deleted until the conversion is successful, ensuring pending videos are processed on subsequent runs.

## Dependencies

- [FFmpeg](https://ffmpeg.org/): A powerful multimedia framework for processing audio and video files.
- [PDFKit](https://pdfkit.org/): A PDF generation library for Node.js.
- [image-size](https://github.com/image-size/image-size): A library to determine the dimensions of images.

## Contributing

Contributions are welcome! Feel free to submit bug reports, feature requests, or pull requests.

## License

This project is licensed under the [MIT License](LICENSE).
