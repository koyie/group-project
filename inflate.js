/* 
Reads a file in tiny chunks
options are:
 * - progressCB: a function that accepts the read chunk
                          as its only argument. If binary option
                          is set to true, this function will receive
                          an instance of ArrayBuffer, otherwise a String
 * - errorCB:      an optional function that accepts an object of type
                          FileReader.error
 */
function parseFile(file, options) {
  // providing a default options
  const opts = typeof options === "undefined" ? {} : options;
  // determince the size of the file
  const fileSize = file.size;

  console.log(fileSize);
  // each file will be read in this much of chunk
  const chunkSize = 64 * 1024;

  let offset = 0;

  const chunkReadCallback =
    typeof opts["progressCB"] === "function"
      ? opts["progressCB"]
      : function () {};
  const chunkErrorCallback =
    typeof opts["errorCB"] === "function" ? opts["errorCB"] : function () {};

  function onLoadHandler(evt) {
    if (evt.target.error === null) {
      offset += evt.target.result.byteLength;
      // checking if the file read entirely
      const isFinishedReading = offset >= fileSize;
      chunkReadCallback({
        data: evt.target.result,
        isFinished: isFinishedReading,
        progress: Math.round((offset / fileSize) * 100),
      });

      if (isFinishedReading) return;
    } else {
      // an error occurred read the file
      chunkErrorCallback(evt.target.error);
      return;
    }

    readBlock(offset, chunkSize, file);
  }

  function readBlock() {
    var r = new FileReader();
    var blob = file.slice(offset, chunkSize + offset);
    r.onload = onLoadHandler;
    r.readAsArrayBuffer(blob);
  }

  readBlock(offset, chunkSize, file);
}

/**
 * deflates a given file
 * @param {*} file the file deflate (it only accepts one file, folder or multiple files don't work)
 * @param {*} progressCB this function will be called everytime the progress updated
 * @param {*} cb this function will called when there is an error or the compression is success
 */
function deflate(file, progressCB, cb) {
  try {
    if (
      !(file instanceof File) ||
      typeof progressCB !== "function" ||
      typeof cb !== "function"
    )
      return;
    const deflatedFile = new pako.Deflate();

    parseFile(file, {
      progressCB: (results) => {
        progressCB(results.progress);
        deflatedFile.push(results.data, results.isFinished);

        if (!results.isFinished) return;

        if (!deflatedFile.err) {
          console.log(deflatedFile.msg);
          return;
        }

        const fileStream = streamSaver.createWriteStream(
          `${file.name}.deflate`,
          {
            size: deflatedFile.result.byteLength, // (optional filesize) Will show progress
            writableStrategy: undefined, // (optional)
            readableStrategy: undefined, // (optional)
          }
        );

        cb(deflatedFile.result);

        const writer = fileStream.getWriter();
        writer.write(deflatedFile.result);
        writer.close();
      },
      errorCB: (err) => {
        console.log("an error occurred while reading the file");
      },
    });
  } catch (error) {
    cb(error);
  }
}

/**
 * Inflates a given file
 * @param {*} file the file deflate (it only accepts one file, folder or multiple files don't work)
 * @param {*} progressCB this function will be called everytime the progress updated
 * @param {*} cb this function will called when there is an error or the compression is success
 */
function inflate(file, progressCB, cb) {
  try {
    if (
      !(file instanceof File) ||
      typeof progressCB !== "function" ||
      typeof cb !== "function"
    )
      return;

    const inflatedFile = new pako.Inflate();

    parseFile(file, {
      progressCB: (results) => {
        progressCB(results.progress);
        inflatedFile.push(results.data, results.isFinished);

        if (!results.isFinished) return;

        if (!inflatedFile.err) {
          console.log(inflatedFile.msg);
          return;
        }

        const hasDeflateExt = file.name.includes(".deflate");
        let filename;
        if (!hasDeflateExt) filename = "InflatedFile.txt";
        else filename = file.name.replace(".deflate", "");

        const fileStream = streamSaver.createWriteStream(filename, {
          size: inflatedFile.result.byteLength, // (optional filesize) Will show progress
          writableStrategy: undefined, // (optional)
          readableStrategy: undefined, // (optional)
        });

        cb(inflatedFile.result);

        const writer = fileStream.getWriter();
        writer.write(inflatedFile.result);
        writer.close();
      },
      errorCB: (err) => {
        console.log("an error occurred while reading the file");
      },
    });
  } catch (error) {
    cb(error);
  }
}
