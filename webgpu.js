function construct_webgpu(my_canvas) {
  this.canvas = document.getElementById(my_canvas);

  this.create = async function () {
    this.gpu = await navigator.gpu;
    this.adapter = await this.gpu.requestAdapter();
    this.device = await this.adapter.requestDevice();

    this.context = this.canvas.getContext("webgpu");
    this.context.configure({
      device: this.device,
      format: this.gpu.getPreferredCanvasFormat(),
      usage: GPUTextureUsage.COPY_DST + GPUTextureUsage.RENDER_ATTACHMENT,
      alphaMode: "premultiplied",
    });
    return this;
  };
}

export const create_webgpu = async function (my_canvas) {
  return await new construct_webgpu(my_canvas).create();
};
