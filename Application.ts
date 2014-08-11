declare var saveAs: Function;

class Application {
    files = ko.observableArray<BARFile>();
    imgFiles: Entry[] = [];

    loadBAR(file: File) {
        var ext = file.name.split('.').pop().toLowerCase();
        if (ext != "bar") {
            alert("Unrecognised format: " + ext + " please load BAR files");
            return;
        }
        var bar = new BARFile();
        bar.root.entries.subscribe(function (changes: KnockoutArrayChange<Entry>[]) {
            for (var c = 0; c < changes.length; ++c) {
                var change = changes[c];
                if (change.status == "added") {
                    var entry = change.value;
                    switch (entry.extension.toLowerCase()) {
                        case "btx": this.queueImage(entry); break;
                        case "xmb": case "xml": entry.image("img/XML80.png"); break;
                        case "txt": entry.image("img/TXT80.png"); break;
                    }
                }
            }
        }, this, "arrayChange");
        bar.read(file);
        this.files.push(bar);
    }

    private queueImage(img: Entry) {
        this.imgFiles.push(img);
        if (this.imgFiles.length == 1) setTimeout(this.tickImageQueue.bind(this), 1);
    }
    private iconData: ImageData;
    private iconCanvas: HTMLCanvasElement;
    private iconContext: CanvasRenderingContext2D;
    private tickImageQueue() {
        if (!this.iconCanvas) {
            this.iconCanvas = document.createElement("canvas");
            this.iconCanvas.width = 32;
            this.iconCanvas.height = 32;
            this.iconContext = this.iconCanvas.getContext("2d");
            this.iconData = this.iconContext.createImageData(this.iconCanvas.width, this.iconCanvas.height);
        }
        var img = this.imgFiles.pop();
        var imgData = BTXFile.readPixels(img.readBytes(), ImageTypes.Visible, function () { return this.iconData; }.bind(this));
        this.iconContext.putImageData(imgData, 0, 0);
        img.image(this.iconCanvas.toDataURL());
        if (this.imgFiles.length > 0) {
            var waitTick = function (ticks) {
                if (ticks == 0) this.tickImageQueue();
                else setTimeout(function () { waitTick(ticks - 1); }, 2);
            }.bind(this);
            waitTick(4);
        }
    }

    openFolder(bar: BARFile, folder: Folder) {
        if (folder == null) {
            bar.path.splice(0);
        } else {
            var path = bar.path();
            var findex = path.indexOf(folder);
            if (findex >= 0) {
                findex++;
                if (findex < path.length) {
                    path.splice(findex, path.length - findex);
                }
            } else {
                bar.path.push(folder);
            }
        }
    }

    closeFile(bar: BARFile) {
        bar.cancelLoad = true;
        var index = this.files.indexOf(bar);
        if (index >= 0) this.files.splice(index, 1);
    }

    openFile(bar: BARFile, entry: Entry, type?: string) {
        var data = entry.readBytes();
        if (type == "image" || type == "image.mask" || type == "image.color") {
            var canvas = document.createElement("canvas");
            var context = canvas.getContext("2d");
            switch (type) {
                case "image": BTXFile.readToCanvas(data, ImageTypes.Visible, context); break;
                case "image.mask": BTXFile.readToCanvas(data, ImageTypes.Mask, context); break;
                case "image.color": BTXFile.readToCanvas(data, ImageTypes.Color, context); break;
            }
            
            (<any>canvas).toBlob(function (data) {
                saveAs(new Blob([data], { type: "image/png" }), entry.name + ".png");
            });
            //var dataStr = canvas.toDataURL("image/png");
            //data = new Uint8Array(dataStr.length);
            //for (var s = 0; s < dataStr.length; ++s) data[s] = dataStr.charCodeAt(s);
        } else if (type == "tga") {
            var imgData: ImageData = BTXFile.readPixels(data, ImageTypes.Raw);
            var tgaData = this.saveTGA(imgData);
            saveAs(new Blob([tgaData], { type: "image/x-tga" }), entry.name + ".tga");
        } else {
            saveAs(new Blob([data], { type: "application/octet-stream" }), entry.name);
        }
    }

    saveTGA(data: ImageData) {
        var writer = new ByteStream();
        writer.writeInt8(0);
        writer.writeInt8(0);
        writer.writeInt8(2);
        writer.writeInt16(0);
        writer.writeInt16(0);
        writer.writeInt8(0);
        writer.writeInt16(0);
        writer.writeInt16(0);
        writer.writeInt16(data.width);
        writer.writeInt16(data.height);
        writer.writeInt8(32);
        writer.writeInt8(8);
        for (var y = 0; y < data.height; ++y) {
            for (var x = 0; x < data.width; ++x) {
                var i = x + y * data.width;
                writer.writeInt8(data.data[i * 4 + 2]);
                writer.writeInt8(data.data[i * 4 + 1]);
                writer.writeInt8(data.data[i * 4 + 0]);
                writer.writeInt8(data.data[i * 4 + 3]);
            }
        }
        return writer.buffer;
    }
}
