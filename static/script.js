const uploadButton =
    document.getElementById("uploadButton");

const fileInput =
    document.getElementById("fileInput");

const uploadCard =
    document.getElementById("uploadCard");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const notification =
    document.getElementById("notification");

const totalFiles =
    document.getElementById("totalFiles");

const storageUsed =
    document.getElementById("storageUsed");


/* 
   LOAD STORAGE STATISTICS
*/

async function loadStorageStats() {

    try {

        const response =
            await fetch("/api/storage");


        const stats =
            await response.json();


        totalFiles.textContent =
            stats.file_count;


        storageUsed.textContent =
            formatFileSize(
                stats.total_size
            );


    } catch (error) {

        console.error(
            "Could not load storage statistics:",
            error
        );

    }

}


/* 
   SHOW NOTIFICATION
*/

function showNotification(
    message,
    type = "success"
) {

    notification.textContent =
        message;


    notification.className =
        "notification";


    notification.classList.add(
        type
    );


    notification.classList.add(
        "show"
    );


    setTimeout(function () {

        notification.classList.remove(
            "show"
        );

    }, 3000);

}


/* 
   SEARCH FILES
*/

searchInput.addEventListener(
    "input",
    function () {

        loadFiles();

    }
);


/* 
   OPEN FILE SELECTOR
*/

uploadButton.addEventListener(
    "click",
    function () {

        fileInput.click();

    }
);


/* 
   HANDLE SELECTED FILES
*/

fileInput.addEventListener(
    "change",
    function () {

        const selectedFiles =
            fileInput.files;


        uploadFiles(
            selectedFiles
        );

    }
);


/* 
   DRAG OVER
*/

uploadCard.addEventListener(
    "dragover",
    function (event) {

        event.preventDefault();

        uploadCard.classList.add(
            "drag-over"
        );

    }
);


/* 
   DRAG LEAVE
*/

uploadCard.addEventListener(
    "dragleave",
    function () {

        uploadCard.classList.remove(
            "drag-over"
        );

    }
);


/* 
   DROP FILES
*/

uploadCard.addEventListener(
    "drop",
    function (event) {

        event.preventDefault();


        uploadCard.classList.remove(
            "drag-over"
        );


        const droppedFiles =
            event.dataTransfer.files;


        uploadFiles(
            droppedFiles
        );

    }
);


/* 
   UPLOAD FILES
*/

async function uploadFiles(files) {

    if (!files || files.length === 0) {

        return;

    }


    uploadButton.disabled = true;

    uploadButton.textContent =
        "Uploading...";


    for (const file of files) {

        console.log(
            "Uploading:",
            file.name
        );


        const formData =
            new FormData();


        formData.append(
            "file",
            file
        );


        try {

            const response =
                await fetch(
                    "/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const result =
                await response.json();


            if (result.success) {

                showNotification(
                    `${result.filename} uploaded successfully.`,
                    "success"
                );


            } else {

                showNotification(
                    result.message,
                    "error"
                );

            }


        } catch (error) {

            console.error(
                "Upload error:",
                error
            );


            showNotification(
                "Upload failed. Please try again.",
                "error"
            );

        }

    }


    await loadFiles();

    await loadStorageStats();


    uploadButton.disabled =
        false;


    uploadButton.textContent =
        "Choose Files";


    fileInput.value = "";

}


/* 
   LOAD FILES FROM FLASK
 */

async function loadFiles() {

    try {

        const response =
            await fetch(
                "/api/files"
            );


        const files =
            await response.json();


        const searchTerm =
            searchInput.value
                .trim()
                .toLowerCase();


        const filteredFiles =
            files.filter(
                function (file) {

                    return file.name
                        .toLowerCase()
                        .includes(searchTerm);

                }
            );


        displayFiles(
            filteredFiles
        );


    } catch (error) {

        console.error(
            "Could not load files:",
            error
        );

    }

}


/* 
   DISPLAY FILES
*/

function displayFiles(files) {

    const fileTable =
        document.querySelector(
            ".file-table"
        );


    /* Remove existing file rows */

    document
        .querySelectorAll(".file-row")
        .forEach(function (row) {

            row.remove();

        });


    /* Show empty state */

    if (files.length === 0) {

        emptyState.style.display =
            "block";


        if (
            searchInput.value
                .trim() !== ""
        ) {

            emptyState
                .querySelector("h3")
                .textContent =
                "No matching files";


            emptyState
                .querySelector("p")
                .textContent =
                "Try a different search term.";

        } else {

            emptyState
                .querySelector("h3")
                .textContent =
                "No files yet";


            emptyState
                .querySelector("p")
                .textContent =
                "Upload your first file to get started.";

        }


        return;

    }


    /* Hide empty state */

    emptyState.style.display =
        "none";


    /* Create a row for every file */

    files.forEach(
        function (file) {

            const row =
                document.createElement(
                    "div"
                );


            row.classList.add(
                "file-row"
            );


            row.innerHTML = `
                <span class="file-name">
                    ${file.name}
                </span>

                <span>
                    ${getFileType(file.name)}
                </span>

                <span>
                    ${formatFileSize(file.size)}
                </span>

                <span class="action-group">

                    <a
                        class="action-button"
                        href="/download/${encodeURIComponent(file.name)}"
                    >
                        Download
                    </a>

                    <button
                        class="action-button delete-button"
                        type="button"
                    >
                        Delete
                    </button>

                </span>
            `;


            const deleteButton =
                row.querySelector(
                    ".delete-button"
                );


            deleteButton.addEventListener(
                "click",
                function () {

                    deleteFile(
                        file.name
                    );

                }
            );


            fileTable.appendChild(
                row
            );

        }
    );

}


/* 
   GET FILE TYPE
*/

function getFileType(filename) {

    const extension =
        filename
            .split(".")
            .pop()
            .toUpperCase();


    if (
        extension ===
        filename.toUpperCase()
    ) {

        return "File";

    }


    return extension;

}


/* 
   FORMAT FILE SIZE
*/

function formatFileSize(bytes) {

    if (bytes === 0) {

        return "0 Bytes";

    }


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    const size =
        bytes /
        Math.pow(
            1024,
            index
        );


    return `${size.toFixed(1)} ${units[index]}`;

}


/* 
   DELETE FILE
*/

async function deleteFile(filename) {

    const confirmed =
        confirm(
            `Are you sure you want to delete "${filename}"?`
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/files/${encodeURIComponent(filename)}`,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (result.success) {

            showNotification(
                result.message,
                "success"
            );


            await loadFiles();

            await loadStorageStats();


        } else {

            showNotification(
                result.message,
                "error"
            );

        }


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );


        showNotification(
            "Could not delete the file.",
            "error"
        );

    }

}


/* 
   LOAD DATA WHEN PAGE OPENS
*/

loadFiles();

loadStorageStats();


/* 
   INITIAL BUTTON STATE
*/

uploadButton.disabled =
    false;

uploadButton.textContent =
    "Choose Files";