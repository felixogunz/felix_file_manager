// DOM ELEMENTS

const uploadButton =
    document.getElementById("uploadButton");

const fileInput =
    document.getElementById("fileInput");

const newFolderButton =
    document.getElementById("newFolderButton");

const searchInput =
    document.getElementById("searchInput");

const fileList =
    document.getElementById("fileList");

const emptyState =
    document.getElementById("emptyState");

const fileCount =
    document.getElementById("fileCount");

const folderCount =
    document.getElementById("folderCount");

const storageUsed =
    document.getElementById("storageUsed");

const itemCount =
    document.getElementById("itemCount");

const breadcrumb =
    document.getElementById("breadcrumb");

const currentFolderTitle =
    document.getElementById("currentFolderTitle");

const homeButton =
    document.getElementById("homeButton");

const notification =
    document.getElementById("notification");

const uploadStatus =
    document.getElementById("uploadStatus");

const previewModal =
    document.getElementById("previewModal");

const previewTitle =
    document.getElementById("previewTitle");

const previewBody =
    document.getElementById("previewBody");

const closePreviewButton =
    document.getElementById("closePreviewButton");

const infoModal =
    document.getElementById("infoModal");

const infoBody =
    document.getElementById("infoBody");

const closeInfoButton =
    document.getElementById("closeInfoButton");



// APPLICATION STATE

let currentFolder = "";

let allFiles = [];

let allFolders = [];


// START APPLICATION

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadFiles();

        loadStorageStats();

        updateBreadcrumb();

    }
);



// UPLOAD BUTTON

uploadButton.addEventListener(
    "click",
    () => {

        fileInput.click();

    }
);



// FILE SELECTION

fileInput.addEventListener(
    "change",
    async () => {

        const files =
            Array.from(fileInput.files);

        for (const file of files) {

            await uploadFile(file);

        }

        fileInput.value = "";

        await loadFiles();

        await loadStorageStats();

    }
);



// UPLOAD FILE

async function uploadFile(file) {

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    formData.append(
        "folder",
        currentFolder
    );

    showUploadStatus(
        `Uploading ${file.name}...`
    );

    try {

        const response =
            await fetch(
                "/api/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Upload failed"
            );

        }

        showNotification(
            `${file.name} uploaded successfully.`,
            "success"
        );

    } catch (error) {

        showNotification(
            error.message,
            "error"
        );

    }

    hideUploadStatus();

}



// LOAD FILES

async function loadFiles() {

    try {

        const url =
            currentFolder
                ? `/api/files?folder=${encodeURIComponent(currentFolder)}`
                : "/api/files";

        const response =
            await fetch(url);

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to load files"
            );

        }

        allFiles =
            data.files || [];

        allFolders =
            data.folders || [];

        currentFolder =
            data.current_folder || "";

        displayItems();

        updateBreadcrumb();

        updateCurrentFolderTitle();

    } catch (error) {

        showNotification(
            error.message,
            "error"
        );

    }

}


// DISPLAY FILES AND FOLDERS

function displayItems() {

    fileList.replaceChildren();

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();


    const filteredFolders =
        allFolders.filter(
            folder =>
                folder.name
                    .toLowerCase()
                    .includes(searchTerm)
        );


    const filteredFiles =
        allFiles.filter(
            file =>
                file.name
                    .toLowerCase()
                    .includes(searchTerm)
        );


    const totalItems =
        filteredFolders.length +
        filteredFiles.length;


    itemCount.textContent =
        `${totalItems} item${totalItems === 1 ? "" : "s"}`;


    if (totalItems === 0) {

        emptyState.classList.remove(
            "hidden"
        );

        return;

    }


    emptyState.classList.add(
        "hidden"
    );


    filteredFolders.forEach(
        folder => {

            fileList.appendChild(
                createFolderElement(folder)
            );

        }
    );


    filteredFiles.forEach(
        file => {

            fileList.appendChild(
                createFileElement(file)
            );

        }
    );

}


// CREATE FOLDER ELEMENT

function createFolderElement(folder) {

    const element =
        document.createElement("div");

    element.className =
        "file-item folder-item";


    const icon =
        document.createElement("div");

    icon.className =
        "item-icon";

    icon.textContent =
        "📁";


    const details =
        document.createElement("div");

    details.className =
        "item-details";


    const name =
        document.createElement("div");

    name.className =
        "item-name";

    name.textContent =
        folder.name;


    const type =
        document.createElement("div");

    type.className =
        "item-meta";

    type.textContent =
        "Folder";


    details.appendChild(name);

    details.appendChild(type);


    const actions =
        document.createElement("div");

    actions.className =
        "item-actions";


    const openButton =
        createActionButton(
            "Open",
            "action-button",
            () => openFolder(folder.path)
        );


    const renameButton =
        createActionButton(
            "Rename",
            "action-button",
            () => renameItem(folder.path)
        );


    const deleteButton =
        createActionButton(
            "Delete",
            "danger-button",
            () => deleteItem(folder.path)
        );


    actions.appendChild(openButton);

    actions.appendChild(renameButton);

    actions.appendChild(deleteButton);


    element.appendChild(icon);

    element.appendChild(details);

    element.appendChild(actions);


    return element;

}


// CREATE FILE ELEMENT

function createFileElement(file) {

    const element =
        document.createElement("div");

    element.className =
        "file-item";


    const icon =
        document.createElement("div");

    icon.className =
        "item-icon";

    icon.textContent =
        getFileIcon(file.extension);


    const details =
        document.createElement("div");

    details.className =
        "item-details";


    const name =
        document.createElement("div");

    name.className =
        "item-name";

    name.textContent =
        file.name;


    const meta =
        document.createElement("div");

    meta.className =
        "item-meta";

    meta.textContent =
        `${file.extension.toUpperCase() || "FILE"} • ${formatBytes(file.size)}`;


    details.appendChild(name);

    details.appendChild(meta);


    const actions =
        document.createElement("div");

    actions.className =
        "item-actions";


    const previewButton =
        createActionButton(
            "Preview",
            "action-button",
            () => previewFile(file)
        );


    const infoButton =
        createActionButton(
            "Info",
            "action-button",
            () => showFileInfo(file)
        );


    const downloadButton =
        createActionButton(
            "Download",
            "action-button",
            () => downloadFile(file)
        );


    const renameButton =
        createActionButton(
            "Rename",
            "action-button",
            () => renameItem(file.path)
        );


    const deleteButton =
        createActionButton(
            "Delete",
            "danger-button",
            () => deleteItem(file.path)
        );


    actions.appendChild(
        previewButton
    );

    actions.appendChild(
        infoButton
    );

    actions.appendChild(
        downloadButton
    );

    actions.appendChild(
        renameButton
    );

    actions.appendChild(
        deleteButton
    );


    element.appendChild(icon);

    element.appendChild(details);

    element.appendChild(actions);


    return element;

}


// CREATE ACTION BUTTON


function createActionButton(
    text,
    className,
    callback
) {

    const button =
        document.createElement("button");

    button.type =
        "button";

    button.className =
        className;

    button.textContent =
        text;

    button.addEventListener(
        "click",
        callback
    );

    return button;

}



// OPEN FOLDER


async function openFolder(path) {

    currentFolder =
        path;

    await loadFiles();

}



// HOME


homeButton.addEventListener(
    "click",
    async () => {

        currentFolder =
            "";

        await loadFiles();

    }
);



// SEARCH

searchInput.addEventListener(
    "input",
    () => {

        displayItems();

    }
);



// NEW FOLDER


newFolderButton.addEventListener(
    "click",
    async () => {

        const name =
            prompt(
                "Enter the new folder name:"
            );

        if (!name) {
            return;
        }


        try {

            const response =
                await fetch(
                    "/api/folders",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            name: name,
                            parent: currentFolder
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Unable to create folder"
                );

            }


            showNotification(
                "Folder created successfully.",
                "success"
            );


            await loadFiles();

            await loadStorageStats();


        } catch (error) {

            showNotification(
                error.message,
                "error"
            );

        }

    }
);



// PREVIEW FILE

async function previewFile(file) {

    previewTitle.textContent =
        file.name;

    previewBody.replaceChildren();

    previewModal.classList.remove(
        "hidden"
    );


    const extension =
        file.extension.toLowerCase();


    const previewUrl =
        `/api/preview/${encodeURIComponent(file.path)}`;


    // Images

    if (
        [
            "jpg",
            "jpeg",
            "png",
            "gif"
        ].includes(extension)
    ) {

        const image =
            document.createElement("img");

        image.src =
            previewUrl;

        image.alt =
            file.name;

        image.className =
            "preview-image";

        previewBody.appendChild(
            image
        );

        return;

    }


    // PDF

    if (extension === "pdf") {

        const iframe =
            document.createElement("iframe");

        iframe.src =
            previewUrl;

        iframe.className =
            "preview-frame";

        previewBody.appendChild(
            iframe
        );

        return;

    }


    // Text and CSV

    if (
        [
            "txt",
            "csv"
        ].includes(extension)
    ) {

        try {

            const response =
                await fetch(previewUrl);

            const text =
                await response.text();

            const pre =
                document.createElement("pre");

            pre.className =
                "text-preview";

            pre.textContent =
                text;

            previewBody.appendChild(
                pre
            );

        } catch (error) {

            showNotification(
                "Unable to preview this file.",
                "error"
            );

        }

        return;

    }


    // Other file types

    const message =
        document.createElement("p");

    message.textContent =
        "Preview is not available for this file type.";

    previewBody.appendChild(
        message
    );

}



// CLOSE PREVIEW

closePreviewButton.addEventListener(
    "click",
    () => {

        previewModal.classList.add(
            "hidden"
        );

        previewBody.replaceChildren();

    }
);



// FILE INFORMATION

function showFileInfo(file) {

    infoBody.replaceChildren();


    const information = [
        ["Name", file.name],
        ["Type", file.extension.toUpperCase() || "File"],
        ["Size", formatBytes(file.size)],
        ["MIME Type", file.mime_type],
        ["Path", file.path]
    ];


    information.forEach(
        ([label, value]) => {

            const row =
                document.createElement("div");

            row.className =
                "info-row";


            const labelElement =
                document.createElement("strong");

            labelElement.textContent =
                label;


            const valueElement =
                document.createElement("span");

            valueElement.textContent =
                value;


            row.appendChild(
                labelElement
            );

            row.appendChild(
                valueElement
            );


            infoBody.appendChild(
                row
            );

        }
    );


    infoModal.classList.remove(
        "hidden"
    );

}



// CLOSE INFORMATION

closeInfoButton.addEventListener(
    "click",
    () => {

        infoModal.classList.add(
            "hidden"
        );

    }
);



// DOWNLOAD

function downloadFile(file) {

    const url =
        `/api/download/${encodeURIComponent(file.path)}`;

    const link =
        document.createElement("a");

    link.href =
        url;

    link.download =
        file.name;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

}



// RENAME

async function renameItem(path) {

    const oldName =
        path.split("/").pop();


    const newName =
        prompt(
            "Enter the new name:",
            oldName
        );


    if (!newName || newName === oldName) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/rename",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        old_path: path,
                        new_name: newName
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to rename item"
            );

        }


        showNotification(
            "Renamed successfully.",
            "success"
        );


        await loadFiles();

        await loadStorageStats();


    } catch (error) {

        showNotification(
            error.message,
            "error"
        );

    }

}



// DELETE

async function deleteItem(path) {

    const name =
        path.split("/").pop();


    const confirmed =
        confirm(
            `Are you sure you want to delete "${name}"?`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/delete",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        path: path
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to delete item"
            );

        }


        showNotification(
            "Deleted successfully.",
            "success"
        );


        await loadFiles();

        await loadStorageStats();


    } catch (error) {

        showNotification(
            error.message,
            "error"
        );

    }

}



// STORAGE STATISTICS

async function loadStorageStats() {

    try {

        const response =
            await fetch(
                "/api/storage"
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to load storage statistics"
            );

        }


        fileCount.textContent =
            data.file_count;


        folderCount.textContent =
            data.folder_count;


        storageUsed.textContent =
            formatBytes(
                data.total_size
            );


    } catch (error) {

        console.error(
            error
        );

    }

}


// BREADCRUMB

function updateBreadcrumb() {

    breadcrumb.replaceChildren();


    if (!currentFolder) {

        breadcrumb.textContent =
            "/";

        return;

    }


    const parts =
        currentFolder.split("/");


    parts.forEach(
        (part, index) => {

            const separator =
                document.createElement("span");

            separator.textContent =
                " / ";


            const button =
                document.createElement("button");

            button.className =
                "breadcrumb-link";

            button.textContent =
                part;


            const targetPath =
                parts
                    .slice(0, index + 1)
                    .join("/");


            button.addEventListener(
                "click",
                async () => {

                    currentFolder =
                        targetPath;

                    await loadFiles();

                }
            );


            breadcrumb.appendChild(
                separator
            );

            breadcrumb.appendChild(
                button
            );

        }
    );

}



// CURRENT FOLDER TITLE

function updateCurrentFolderTitle() {

    if (!currentFolder) {

        currentFolderTitle.textContent =
            "Files";

        return;

    }


    const parts =
        currentFolder.split("/");


    currentFolderTitle.textContent =
        parts[parts.length - 1];

}



// FILE ICON

function getFileIcon(extension) {

    const icons = {

        pdf: "📕",

        doc: "📘",

        docx: "📘",

        xls: "📗",

        xlsx: "📗",

        csv: "📊",

        ppt: "📙",

        pptx: "📙",

        jpg: "🖼️",

        jpeg: "🖼️",

        png: "🖼️",

        gif: "🖼️",

        zip: "🗜️",

        txt: "📄"

    };


    return (
        icons[extension] ||
        "📄"
    );

}



// FORMAT FILE SIZE

function formatBytes(bytes) {

    if (bytes === 0) {
        return "0 B";
    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (
        parseFloat(
            (
                bytes /
                Math.pow(
                    1024,
                    index
                )
            ).toFixed(2)
        )
        + " "
        + units[index]
    );

}


// NOTIFICATIONS

function showNotification(
    message,
    type = "success"
) {

    notification.textContent =
        message;

    notification.className =
        `notification ${type}`;

    setTimeout(
        () => {

            notification.classList.add(
                "hidden"
            );

        },
        3000
    );

}


// UPLOAD STATUS

function showUploadStatus(message) {

    uploadStatus.textContent =
        message;

    uploadStatus.classList.remove(
        "hidden"
    );

}


function hideUploadStatus() {

    uploadStatus.classList.add(
        "hidden"
    );

}



// CLOSE MODALS WHEN CLICKING OUTSIDE

window.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            previewModal
        ) {

            previewModal.classList.add(
                "hidden"
            );

        }


        if (
            event.target ===
            infoModal
        ) {

            infoModal.classList.add(
                "hidden"
            );

        }

    }
);