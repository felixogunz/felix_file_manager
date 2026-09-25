from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    send_from_directory,
    send_file
)

from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

import os
import shutil
import mimetypes


app = Flask(__name__)


# ============================================================
# CONFIGURATION
# ============================================================

STORAGE_FOLDER = "storage"

MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    "txt",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "csv",
    "ppt",
    "pptx",
    "jpg",
    "jpeg",
    "png",
    "gif",
    "zip"
}

app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE


# ============================================================
# STORAGE SETUP
# ============================================================

os.makedirs(STORAGE_FOLDER, exist_ok=True)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def safe_path(relative_path=""):
    """
    Makes sure the requested path stays inside storage/.
    """

    base = os.path.abspath(STORAGE_FOLDER)

    target = os.path.abspath(
        os.path.join(STORAGE_FOLDER, relative_path)
    )

    if os.path.commonpath([base, target]) != base:
        raise ValueError("Invalid file path")

    return target


def clean_relative_path(path):
    """
    Cleans a user-provided relative path.
    """

    if not path:
        return ""

    parts = path.replace("\\", "/").split("/")

    cleaned = []

    for part in parts:
        if not part or part == ".":
            continue

        if part == "..":
            raise ValueError("Invalid path")

        cleaned.append(secure_filename(part))

    return "/".join(part for part in cleaned if part)


def get_file_info(full_path, relative_path):
    """
    Returns information about a file.
    """

    size = os.path.getsize(full_path)

    filename = os.path.basename(full_path)

    extension = ""

    if "." in filename:
        extension = filename.rsplit(".", 1)[1].lower()

    mime_type, _ = mimetypes.guess_type(filename)

    return {
        "name": filename,
        "path": relative_path.replace("\\", "/"),
        "size": size,
        "extension": extension,
        "mime_type": mime_type or "application/octet-stream"
    }


# ============================================================
# MAIN PAGE
# ============================================================

@app.route("/")
def index():
    return render_template("index.html")


# ============================================================
# LIST FILES AND FOLDERS
# ============================================================

@app.route("/api/files")
def list_files():

    folder = request.args.get("folder", "")

    try:
        folder = clean_relative_path(folder)
        folder_path = safe_path(folder)

    except ValueError:
        return jsonify({
            "success": False,
            "message": "Invalid folder path"
        }), 400

    if not os.path.isdir(folder_path):
        return jsonify({
            "success": False,
            "message": "Folder does not exist"
        }), 404

    files = []
    folders = []

    for item in os.listdir(folder_path):

        full_path = os.path.join(folder_path, item)

        relative_path = os.path.relpath(
            full_path,
            STORAGE_FOLDER
        ).replace("\\", "/")

        if os.path.isdir(full_path):

            folders.append({
                "name": item,
                "path": relative_path
            })

        else:

            files.append(
                get_file_info(
                    full_path,
                    relative_path
                )
            )

    files.sort(
        key=lambda x: x["name"].lower()
    )

    folders.sort(
        key=lambda x: x["name"].lower()
    )

    return jsonify({
        "success": True,
        "files": files,
        "folders": folders,
        "current_folder": folder
    })


# ============================================================
# STORAGE STATISTICS
# ============================================================

@app.route("/api/storage")
def storage_stats():

    total_size = 0
    file_count = 0
    folder_count = 0

    for root, dirs, files in os.walk(STORAGE_FOLDER):

        folder_count += len(dirs)

        for filename in files:

            full_path = os.path.join(
                root,
                filename
            )

            try:
                total_size += os.path.getsize(
                    full_path
                )

                file_count += 1

            except OSError:
                pass

    return jsonify({
        "success": True,
        "file_count": file_count,
        "folder_count": folder_count,
        "total_size": total_size
    })


# ============================================================
# UPLOAD
# ============================================================

@app.route("/api/upload", methods=["POST"])
def upload_file():

    uploaded_file = request.files.get("file")

    if not uploaded_file:
        return jsonify({
            "success": False,
            "message": "No file was uploaded"
        }), 400

    if not uploaded_file.filename:
        return jsonify({
            "success": False,
            "message": "Please select a file"
        }), 400

    if not allowed_file(uploaded_file.filename):

        return jsonify({
            "success": False,
            "message": "This file type is not allowed"
        }), 400

    folder = request.form.get(
        "folder",
        ""
    )

    try:

        folder = clean_relative_path(folder)

        folder_path = safe_path(folder)

    except ValueError:

        return jsonify({
            "success": False,
            "message": "Invalid folder path"
        }), 400

    os.makedirs(
        folder_path,
        exist_ok=True
    )

    filename = secure_filename(
        uploaded_file.filename
    )

    destination = os.path.join(
        folder_path,
        filename
    )

    # Prevent accidental overwriting
    if os.path.exists(destination):

        name, extension = os.path.splitext(
            filename
        )

        counter = 1

        while os.path.exists(destination):

            new_filename = (
                f"{name} ({counter}){extension}"
            )

            destination = os.path.join(
                folder_path,
                new_filename
            )

            counter += 1

        filename = new_filename

    uploaded_file.save(destination)

    return jsonify({
        "success": True,
        "message": "File uploaded successfully",
        "filename": filename
    })


# ============================================================
# DOWNLOAD
# ============================================================

@app.route("/api/download/<path:filename>")
def download_file(filename):

    try:

        filename = clean_relative_path(filename)

        full_path = safe_path(filename)

    except ValueError:

        return jsonify({
            "success": False,
            "message": "Invalid file path"
        }), 400

    if not os.path.isfile(full_path):

        return jsonify({
            "success": False,
            "message": "File not found"
        }), 404

    directory = os.path.dirname(full_path)

    file_name = os.path.basename(full_path)

    return send_from_directory(
        directory,
        file_name,
        as_attachment=True
    )


# ============================================================
# PREVIEW
# ============================================================

@app.route("/api/preview/<path:filename>")
def preview_file(filename):

    try:

        filename = clean_relative_path(filename)

        full_path = safe_path(filename)

    except ValueError:

        return jsonify({
            "success": False,
            "message": "Invalid file path"
        }), 400

    if not os.path.isfile(full_path):

        return jsonify({
            "success": False,
            "message": "File not found"
        }), 404

    mime_type, _ = mimetypes.guess_type(
        full_path
    )

    if not mime_type:
        mime_type = "application/octet-stream"

    return send_file(
        full_path,
        mimetype=mime_type,
        as_attachment=False
    )


# ============================================================
# CREATE FOLDER
# ============================================================

@app.route("/api/folders", methods=["POST"])
def create_folder():

    data = request.get_json(
        silent=True
    ) or {}

    folder_name = data.get(
        "name",
        ""
    ).strip()

    parent = data.get(
        "parent",
        ""
    )

    if not folder_name:

        return jsonify({
            "success": False,
            "message": "Folder name is required"
        }), 400

    folder_name = secure_filename(
        folder_name
    )

    if not folder_name:

        return jsonify({
            "success": False,
            "message": "Invalid folder name"
        }), 400

    try:

        parent = clean_relative_path(
            parent
        )

        parent_path = safe_path(parent)

        folder_path = os.path.join(
            parent_path,
            folder_name
        )

    except ValueError:

        return jsonify({
            "success": False,
            "message": "Invalid folder path"
        }), 400

    if os.path.exists(folder_path):

        return jsonify({
            "success": False,
            "message": "A file or folder with that name already exists"
        }), 409

    os.makedirs(folder_path)

    return jsonify({
        "success": True,
        "message": "Folder created successfully"
    })


# ============================================================
# RENAME
# ============================================================

@app.route("/api/rename", methods=["POST"])
def rename_item():

    data = request.get_json(
        silent=True
    ) or {}

    old_path = data.get(
        "old_path",
        ""
    )

    new_name = data.get(
        "new_name",
        ""
    ).strip()

    if not old_path or not new_name:

        return jsonify({
            "success": False,
            "message": "Missing rename information"
        }), 400

    try:

        old_path = clean_relative_path(
            old_path
        )

        old_full_path = safe_path(
            old_path
        )

        new_name = secure_filename(
            new_name
        )

        if not new_name:

            raise ValueError(
                "Invalid name"
            )

        parent = os.path.dirname(
            old_full_path
        )

        new_full_path = os.path.join(
            parent,
            new_name
        )

        safe_path(
            os.path.relpath(
                new_full_path,
                STORAGE_FOLDER
            )
        )

    except ValueError:

        return jsonify({
            "success": False,
            "message": "Invalid path or name"
        }), 400

    if not os.path.exists(old_full_path):

        return jsonify({
            "success": False,
            "message": "Item does not exist"
        }), 404

    if os.path.exists(new_full_path):

        return jsonify({
            "success": False,
            "message": "An item with that name already exists"
        }), 409

    os.rename(
        old_full_path,
        new_full_path
    )

    return jsonify({
        "success": True,
        "message": "Renamed successfully"
    })


# ============================================================
# DELETE
# ============================================================

@app.route("/api/delete", methods=["POST"])
def delete_item():

    data = request.get_json(
        silent=True
    ) or {}

    relative_path = data.get(
        "path",
        ""
    )

    if not relative_path:

        return jsonify({
            "success": False,
            "message": "File or folder path is required"
        }), 400

    try:

        relative_path = clean_relative_path(
            relative_path
        )

        full_path = safe_path(
            relative_path
        )

    except ValueError:

        return jsonify({
            "success": False,
            "message": "Invalid path"
        }), 400

    if not os.path.exists(full_path):

        return jsonify({
            "success": False,
            "message": "Item not found"
        }), 404

    if os.path.isdir(full_path):

        shutil.rmtree(full_path)

    else:

        os.remove(full_path)

    return jsonify({
        "success": True,
        "message": "Deleted successfully"
    })


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(
    RequestEntityTooLarge
)
def file_too_large(error):

    return jsonify({
        "success": False,
        "message": "File is too large. Maximum size is 10 MB."
    }), 413


@app.errorhandler(404)
def page_not_found(error):

    return jsonify({
        "success": False,
        "message": "Resource not found"
    }), 404


@app.errorhandler(500)
def internal_error(error):

    return jsonify({
        "success": False,
        "message": "An internal server error occurred"
    }), 500


# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )