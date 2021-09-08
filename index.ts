export interface StringMap<T> {
	[key: string]: T;
}

function updateCanvasRenderBufferSize(canvas: HTMLCanvasElement) {
	let dpr = window.devicePixelRatio;
	let w = canvas.clientWidth * dpr;
	let h = canvas.clientHeight * dpr;
	if (canvas.width != w || canvas.height != h) {
		canvas.width = canvas.clientWidth * dpr;
		canvas.height = canvas.clientHeight * dpr;
	}
}

export class RingBuffer<T> {
	private values: T[] = [];
	private index = 0;

	constructor (private size: number) {
	}

	add(value: T) {
		this.values[this.index] = value;
		this.index = (this.index + 1) % this.size;
	}

	forEach(f: (value: T) => void) {
		let index = this.values.length < this.size ? 0 : this.index;
		for (var i = 0; i < this.values.length; i++) {
			f(this.values[(index + i) % this.size]);
		}
	}

	forLast(n: number, f: (value: T) => void) {
		if (this.values.length < n) throw Error("Not enough values in ring buffer.");
		let index = this.index - n;
		if (index < 0) index = this.values.length + index;
		while (n > 0) {
			f(this.values[index++]);
			if (index == this.values.length) index = 0;
			n--;
		}
	}

	last() {
		if (this.values.length == 0) throw Error("No values in ring buffer.");
		let index = this.index - 1;
		if (index < 0) index = this.values.length - 1;
		return this.values[index];
	}

	length() {
		return this.values.length;
	}
}

export class LineData {
	values: RingBuffer<number>;

	constructor (public numSamples: number, public name: string, public color: string, public width: number = 1) {
		this.values = new RingBuffer<number>(numSamples);
	}

	add(value: number) {
		this.values.add(value);
	}
}

export interface ChartConfig {
	padding: number;
	numSamples: number;
}

export class Chart {
	private ctx: CanvasRenderingContext2D;
	lines: StringMap<LineData> = {};

	constructor (private canvas: HTMLCanvasElement, private config: ChartConfig = { padding: 10, numSamples: 100 }) {
		this.ctx = this.canvas.getContext("2d");
		config.padding = config.padding || 10;
		config.numSamples = config.numSamples || 100;
		this.config = config;
	}

	addLine(name: string, color: string, width: number = 1) {
		let line = new LineData(this.config.numSamples, name, color);
		this.lines[name] = line;
		return line;
	}

	render() {
		updateCanvasRenderBufferSize(this.canvas);
		let w = this.canvas.width;
		let h = this.canvas.height;
		let padding = this.config.padding;
		let ctx = this.ctx;
		ctx.clearRect(0, 0, w, h);
		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;
		for (var name in this.lines) {
			let line = this.lines[name];
			line.values.forLast(line.values.length(), (value) => {
				min = Math.min(min, value);
				max = Math.max(max, value);
			});
		}
		let height = max - min;

		for (var name in this.lines) {
			let line = this.lines[name];
			if (line.values.length() < 2) return;
			let scaleY = height != 0 ? (h - padding * 2) / (max - min) : 1;
			let spacingX = (w - padding * 2) / (this.config.numSamples - 1);

			ctx.strokeStyle = line.color;
			ctx.lineWidth = line.width;
			ctx.save();
			ctx.beginPath()
			let first = true;
			let x = 0;
			line.values.forLast(line.values.length(), (value) => {
				if (first) {
					first = false;
					ctx.moveTo(x + padding, h - (value - min) * scaleY - padding)
				} else ctx.lineTo(x + padding, h - (value - min) * scaleY - padding);
				x += spacingX;
			})
			ctx.stroke()
			ctx.restore();
		}
	}
}