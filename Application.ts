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
    private iconCanvas: HTMLCanvasElement;
    private iconContext: CanvasRenderingContext2D;
    private tickImageQueue() {
        if (!this.iconCanvas) {
            this.iconCanvas = document.createElement("canvas");
            this.iconCanvas.width = 32;
            this.iconCanvas.height = 32;
            this.iconContext = this.iconCanvas.getContext("2d");
        }
        var img = this.imgFiles.pop();
        var canvas = BTXFile.readPixels(img.readBytes(), ImageTypes.Visible, this.iconContext);
        img.image(canvas.toDataURL());
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
            var canvas = null;
            switch (type) {
                case "image": canvas = BTXFile.readPixels(data, ImageTypes.Visible); break;
                case "image.mask": canvas = BTXFile.readPixels(data, ImageTypes.Mask); break;
                case "image.color": canvas = BTXFile.readPixels(data, ImageTypes.Color); break;
            }
            (<any>canvas).toBlob(function (data) {
                saveAs(new Blob([data], { type: "image/png" }), entry.name + ".png");
            });
            //var dataStr = canvas.toDataURL("image/png");
            //data = new Uint8Array(dataStr.length);
            //for (var s = 0; s < dataStr.length; ++s) data[s] = dataStr.charCodeAt(s);
        } else {
            saveAs(new Blob([data], { type: "application/octet-stream" }), entry.name);
        }
    }
}
