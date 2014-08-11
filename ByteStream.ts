class ByteStream {

    buffer: ArrayBuffer;
    ptr: number = 0;
    view: DataView;

    constructor(data?: Uint8Array) {
        if (data != null) {
            this.cloneFrom(data, 0, data.length);
            this.ptr = 0;
        }
    }

    private requireBufferSize(size: number) {
        if (this.buffer != null) {
            if (this.buffer.byteLength >= size) return;
            size = Math.max(this.buffer.byteLength * 2, size);
        }
        this.cloneFrom(this.buffer, 0, size);
    }
    private cloneFrom(buffer: ArrayBuffer, start: number, size: number) {
        this.buffer = new ArrayBuffer(size);
        this.view = new DataView(this.buffer);
        if (buffer != null) {
            var old8 = new Uint8Array(buffer);
            var new8 = new Uint8Array(this.buffer);
            var overlap = Math.min(buffer.byteLength - start, size);
            for (var b = 0; b < overlap; ++b) new8[b] = old8[start + b];
        }
    }

    public skip(bytes: number) {
        this.ptr += bytes;
    }

    public readInt8(): number { var val = this.view.getInt8(this.ptr); this.ptr += 1; return val; }
    public readUint8(): number { var val = this.view.getUint8(this.ptr); this.ptr += 1; return val; }
    public readInt16(): number { var val = this.view.getInt16(this.ptr, true); this.ptr += 2; return val; }
    public readUint16(): number { var val = this.view.getUint16(this.ptr, true); this.ptr += 2; return val; }
    public readInt32(): number { var val = this.view.getInt32(this.ptr, true); this.ptr += 4; return val; }
    public readUint32(): number { var val = this.view.getUint32(this.ptr, true); this.ptr += 4; return val; }

    public writeInt8(val: number) { this.requireBufferSize(this.ptr + 1); this.view.setInt8(this.ptr, val); this.ptr += 1; }
    public writeInt16(val: number) { this.requireBufferSize(this.ptr + 2); this.view.setInt16(this.ptr, val, true); this.ptr += 2; }
    public writeInt32(val: number) { this.requireBufferSize(this.ptr + 4); this.view.setInt32(this.ptr, val, true); this.ptr += 4; }

    public readFloat32(): number {
        var val = this.view.getFloat32(this.ptr, true);
        this.ptr += 4;
        return val;
    }
    public writeFloat32(val: number) {
        this.requireBufferSize(this.ptr + 4);
        this.view.setFloat32(this.ptr, val);
        this.ptr += 4;
    }

    public readString(length?: number): string {
        if (length === undefined) length = this.readInt32();
        if (length == -1) return null;
        var str: string = "";
        for (var b = 0; b < length; ++b) str += String.fromCharCode(this.view.getInt8(this.ptr++));
        return str;
    }
    public writeString(val: string, length?: number) {
        if (length === undefined) this.writeInt32(length = (val ? val.length : -1));
        this.requireBufferSize(this.ptr + Math.max(length, 0));
        for (var b = 0; b < length; ++b) this.view.setInt8(this.ptr++, val.charCodeAt(b));
    }

    public readNullString(): string {
        var str: string = "";
        for (; ;) {
            var c = this.view.getInt8(this.ptr++);
            if (c == 0) break;
            str += String.fromCharCode(c);
        }
        return str;
    }

    public getData(start?: number, length?: number): Uint8Array {
        start = start || 0;
        length = length || (this.ptr - start);
        var old8 = new Uint8Array(this.buffer);
        var new8 = new Uint8Array(new ArrayBuffer(length));
        for (var b = 0; b < length; ++b) new8[b] = old8[start + b];
        return new8;
    }


}