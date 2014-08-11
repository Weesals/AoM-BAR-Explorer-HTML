enum ImageTypes { Raw, Color, Mask, Visible };

class BTXFile {

    static temporaryCanvas: HTMLCanvasElement;
    static temporaryContext: CanvasRenderingContext2D;

    static getImgData(width, height): ImageData {
        if (!this.temporaryCanvas) {
            this.temporaryCanvas = document.createElement("canvas");
            this.temporaryContext = this.temporaryCanvas.getContext("2d");
        }
        this.temporaryCanvas.width = width;
        this.temporaryCanvas.height = height;
        return this.temporaryContext.getImageData(0, 0, width, height);
    }

    static readToCanvas(buffer: Uint8Array, type: ImageTypes, context: CanvasRenderingContext2D) {
        function getImgData(width, height) {
            context.canvas.width = width;
            context.canvas.height = height;
            return context.getImageData(0, 0, width, height);
        }
        var imgData = this.readPixels(buffer, type, getImgData);
        context.putImageData(imgData, 0, 0);
    }

    static readPixels(buffer: Uint8Array, type: ImageTypes = ImageTypes.Raw, getImgData?: (width, height) => ImageData): ImageData {
        if (getImgData == null) {
            getImgData = this.getImgData;
        }


        var stream = new ByteStream(buffer);
        var header = stream.readString(3);
        if (header != "btx") return null;
        stream.skip(6);
        var iwidth = stream.readUint16();
        var iheight = stream.readUint16();

        var imgDataP = stream.ptr;

        var imgData = getImgData(iwidth, iheight);

        var width = imgData.width;
        var height = imgData.height;

        var acount = 0;
        for (var y = 0; y < height; ++y) {
            var iy = Math.round(y * iheight / height);
            for (var x = 0; x < width; ++x) {
                var ix = Math.round(x * iwidth / width);
                stream.ptr = imgDataP + (ix + iy * iwidth) * 4;
                var b = stream.readUint8(),
                    g = stream.readUint8(),
                    r = stream.readUint8(),
                    a = stream.readUint8();
                acount += a;
                var index = (x + y * width) * 4;
                switch (type) {
                    case ImageTypes.Visible:
                    case ImageTypes.Raw:
                        imgData.data[index + 0] = r;
                        imgData.data[index + 1] = g;
                        imgData.data[index + 2] = b;
                        imgData.data[index + 3] = a;
                        break;
                    case ImageTypes.Mask:
                        imgData.data[index + 0] = a;
                        imgData.data[index + 1] = a;
                        imgData.data[index + 2] = a;
                        imgData.data[index + 3] = 255;
                        break;
                    case ImageTypes.Color:
                        imgData.data[index + 0] = r;
                        imgData.data[index + 1] = g;
                        imgData.data[index + 2] = b;
                        imgData.data[index + 3] = 255;
                        break;
                }
            }
        }
        if (type == ImageTypes.Visible && acount == 0) {
            for (var y = 0; y < height; ++y) {
                for (var x = 0; x < width; ++x) {
                    imgData.data[(x + y * width) * 4 + 3] = 255;
                }
            }
        }
        return imgData;
    }

    /*static toCanvas(imgData: ImageData, context: CanvasRenderingContext2D): CanvasRenderingContext2D {
        if (context == null) {
            var canvas = document.createElement("canvas");
            canvas.width = imgData.width;
            canvas.height = imgData.width;
            context = canvas.getContext("2d");
        }
        var width = context.canvas.width;
        var height = context.canvas.height;

        context.putImageData(imgData, 0, 0);
        return context.canvas;
    }*/

}
