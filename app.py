from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    send_from_directory
)

from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

import os


app = Flask(__name__)


# File Storage Configuration

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


app.config["STORAGE_FOLDER"] = STORAGE_FOLDER

app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE


# Create the storage folder if it does not exist

os.makedirs(
    STORAGE_FOLDER,
    exist_ok=True
)


# Check Allowed File Extension


def allowed_file(filename):

    return (
        "." in filename
        and filename.rsplit(
            ".",
            1
        )[1].lower()
        in ALLOWED_EXTENSIONS
    )



# Home Page

@app.route("/")
def index():

    return render_template(
        "index.html"
    )



# Upload File


@app.route("/upload", methods=["POST"])
def upload_file():

    if "file" not in request.files:

        return jsonify({
            "success": False,
            "message": "No file was provided."
        }), 400


    file = request.files["file"]


    if file.filename == "":

        return jsonify({
            "success": False,
            "message": "No file was selected."
        }), 400


    filename = secure_filename(
        file.filename
    )


    if not filename:

        return jsonify({
            "success": False,
            "message": "Invalid filename."
        }), 400


    if not allowed_file(filename):

        return jsonify({
            "success": False,
            "message": "This file type is not allowed."
        }), 400


    file_path = os.path.join(
        app.config["STORAGE_FOLDER"],
        filename
    )


    # Prevent Duplicate Filenames

    if os.path.exists(file_path):

        name, extension = os.path.splitext(
            filename
        )

        counter = 1


        while os.path.exists(file_path):

            new_filename = (
                f"{name}_{counter}{extension}"
            )

            file_path = os.path.join(
                app.config["STORAGE_FOLDER"],
                new_filename
            )

            counter += 1


        filename = new_filename


    file.save(file_path)


    return jsonify({
        "success": True,
        "message": "File uploaded successfully.",
        "filename": filename
    })


# Get All Files

@app.route("/api/files", methods=["GET"])
def get_files():

    files = []


    for filename in os.listdir(
        STORAGE_FOLDER
    ):

        file_path = os.path.join(
            STORAGE_FOLDER,
            filename
        )


        if os.path.isfile(file_path):

            file_size = os.path.getsize(
                file_path
            )


            files.append({
                "name": filename,
                "size": file_size
            })


    return jsonify(files)


# Get Storage Statistics

@app.route("/api/storage", methods=["GET"])
def get_storage_stats():

    file_count = 0

    total_size = 0


    for filename in os.listdir(
        STORAGE_FOLDER
    ):

        file_path = os.path.join(
            STORAGE_FOLDER,
            filename
        )


        if os.path.isfile(file_path):

            file_count += 1

            total_size += os.path.getsize(
                file_path
            )


    return jsonify({
        "file_count": file_count,
        "total_size": total_size
    })


# Create Folder

@app.route("/api/folders", methods=["POST"])
def create_folder():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "message": "No folder data was provided." 
        }), 400

    folder_name = data.get("name", "").strip()


    if not folder_name:

        return jsonify({
            "success": False,
            "message": "Folder name is required."
        }), 400

    folder_name = secure_filename(folder_name)

    if not folder_name:

        return jsonify({
            "success": False,
            "message": "Invalid folder name."
        }), 400

    folder_path = os.path.join( STORAGE_FOLDER, folder_name)


    if os.path.exists(folder_path):

        return jsonify({
            "success": False,
            "message": "A file or folder with this name already exists."
        }), 409

    os.makedirs(folder_path)

    return jsonify({
        "success": True,
        "message": "Folder created successfully.",
        "folder":folder_name
    })


# Download File


@app.route(
    "/download/<path:filename>"
)
def download_file(filename):

    safe_filename = secure_filename(
        filename
    )


    if not safe_filename:

        return jsonify({
            "success": False,
            "message": "Invalid filename."
        }), 400


    file_path = os.path.join(
        app.config["STORAGE_FOLDER"],
        safe_filename
    )


    if not os.path.isfile(file_path):

        return jsonify({
            "success": False,
            "message": "File not found."
        }), 404


    return send_from_directory(
        app.config["STORAGE_FOLDER"],
        safe_filename,
        as_attachment=True
    )


# Delete File

@app.route(
    "/api/files/<path:filename>",
    methods=["DELETE"]
)
def delete_file(filename):

    safe_filename = secure_filename(
        filename
    )


    if not safe_filename:

        return jsonify({
            "success": False,
            "message": "Invalid filename."
        }), 400


    file_path = os.path.join(
        app.config["STORAGE_FOLDER"],
        safe_filename
    )


    if not os.path.isfile(file_path):

        return jsonify({
            "success": False,
            "message": "File not found."
        }), 404


    os.remove(file_path)


    return jsonify({
        "success": True,
        "message": "File deleted successfully."
    })



# Handle Oversized Uploads


@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(error):

    return jsonify({
        "success": False,
        "message": "File is too large. Maximum size is 10 MB."
    }), 413



# Run Application


if __name__ == "__main__":

    app.run(debug=True)