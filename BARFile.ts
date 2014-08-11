class Entry {
    image = ko.observable<string>();

    get extension(): string { return this.name.split('.').pop(); }
    constructor(
        public name: string,
        public offset: number,
        public size: number,
        public buffer: ArrayBuffer)
    {
    }
    readBytes(): Uint8Array {
        return new Uint8Array(this.buffer, this.offset, this.size);
    }
    readBytesAsStr(): string {
        var str = "";
        for (var d = 0; d < this.size; ++d) {
            str += String.fromCharCode(this.buffer[this.offset + d]);
        }
        return str;
    }
}
class Folder {

    folders = ko.observableArray<Folder>();
    entries = ko.observableArray<Entry>();

    constructor(public name: string) { }

    requireFolder(name: string): Folder {
        var folders = this.folders();
        for (var f = 0; f < folders.length; ++f) {
            if (folders[f].name == name) return folders[f];
        }
        var folder = new Folder(name);
        this.folders.push(folder);
        return folder;
    }
}
class BARFile {

    name: string;
    root = new Folder("root");

    cancelLoad: boolean;

    path = ko.observableArray<Folder>();
    topPath = ko.computed(function () {
        var path = this.path();
        if (path.length > 0) return path[path.length - 1];
        return this.root;
    }, this);

    read(file: File) {
        this.name = file.name;
        var reader = new FileReader();
        reader.onerror = function (msg) {
            alert("Unable to load " + file.name + ", because: " + msg);
        }
        reader.onload = function (evnt) {
            var buffer: ArrayBuffer = reader.result;
            if (buffer == null) {
                alert("Unknown error while loading " + file.name + ", try a different browser.");
                return;
            }
            var hstream = new ByteStream(new Uint8Array(buffer, 8 + 4, 3 * 4));
            var entryCount = hstream.readInt32();
            var directorySize = hstream.readInt32();
            var directoryOffset = hstream.readInt32();

            var dstream = new ByteStream(new Uint8Array(buffer, directoryOffset, directorySize));
            var entryTableOffset: number[] = new Array(entryCount);
            for (var e = 0; e < entryTableOffset.length; ++e) {
                entryTableOffset[e] = dstream.readInt32();
            }

            var e = 0;
            var eoffset = 0;
            var estream = null;
            function onComplete() { }
            var loadNext = function () {
                for (var l = 0; l < 10; ++l) {
                    if (this.cancelLoad) return;
                    // Check if there is anything to load
                    if (e >= entryTableOffset.length) {
                        onComplete();
                        return;
                    }

                    var teoffset = directoryOffset + entryTableOffset.length * 4 + entryTableOffset[e];
                    if (estream == null || (eoffset + estream.buffer.byteLength) - teoffset < 128) {
                        eoffset = teoffset;
                        estream = new ByteStream(new Uint8Array(buffer, eoffset, Math.min(2048, buffer.byteLength - eoffset)));
                    }
                    // Load data
                    var offset: number = estream.readInt32();
                    var size: number = estream.readInt32();
                    estream.skip(4 + 3);
                    var isBeta = estream.readInt8() == 0;
                    if (!isBeta) estream.ptr += 4;
                    var name: string = estream.readNullString();
                    var paths = name.split('\\');
                    var folder: Folder = this.root;
                    for (var p = 0; p < paths.length - 1; ++p) {
                        folder = folder.requireFolder(paths[p]);
                    }
                    folder.entries.push(new Entry(paths[paths.length - 1], offset, size, buffer));
                    ++e;
                }
                setTimeout(function () { loadNext(); }, 1);
            }.bind(this);
            loadNext();
        }.bind(this);
        reader.readAsArrayBuffer(file);
    }

}
