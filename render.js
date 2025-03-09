///////////////////////		component	constructor		//////////////////////////////////
function construct_component(my_part, my_component_parameter) {
  this.part = my_part;
  this.component_parameter = my_component_parameter;

  this.render = this.part.render;
  this.webgpu = this.part.webgpu;

  this.create = async function () {
    var my_uniform_buffer = this.webgpu.device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * (8 + 16),
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });
    var texture_promise = await fetch(this.component_parameter.texture_url);
    if (!texture_promise.ok) {
      alert("execute texture data fetch,status is " + texture_promise.status);
      return null;
    }
    var my_texture_blob = await texture_promise.blob();
    var my_texture_imagebitmap = await createImageBitmap(my_texture_blob, {
      imageOrientation: "flipY",
    });

    var my_texture_object = this.webgpu.device.createTexture({
      size: {
        width: my_texture_imagebitmap.width,
        height: my_texture_imagebitmap.height,
      },
      format: "rgba16float",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.webgpu.device.queue.copyExternalImageToTexture(
      {
        source: my_texture_imagebitmap,
      },
      {
        texture: my_texture_object,
      },
      {
        width: my_texture_imagebitmap.width,
        height: my_texture_imagebitmap.height,
      }
    );
    var my_sampler_object = this.webgpu.device.createSampler();

    var my_bindgroup = await this.webgpu.device.createBindGroup({
      layout: this.render.bindgroup_layout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: my_uniform_buffer,
          },
        },
        {
          //texture
          binding: 1,
          resource: my_texture_object.createView(),
        },
        {
          //sampler
          binding: 2,
          resource: my_sampler_object,
        },
      ],
    });

    this.uniform_buffer = my_uniform_buffer;
    this.bindgroup = my_bindgroup;

    return this;
  };
  this.draw = function (pass_encoder) {
    var time_cycle = this.component_parameter.time_cycle;
    var p = (new Date().getTime() % time_cycle) / time_cycle;

    this.webgpu.device.queue.writeBuffer(
      this.uniform_buffer,
      0,
      new Float32Array([
        this.component_parameter.width,
        this.component_parameter.height,
        this.component_parameter.wave_number,
        2.0 * p,
        this.component_parameter.wave_amplitude,
        0,
        0,
        0,

        1,
        0,
        0,
        0,
        0,
        Math.cos(Math.PI / 4.0),
        Math.sin(Math.PI / 4.0),
        0,
        0,
        -Math.sin(Math.PI / 4.0),
        Math.cos(Math.PI / 4.0),
        0,
        0,
        0,
        0.5,
        1,
      ])
    );

    pass_encoder.setPipeline(this.render.pipeline);
    pass_encoder.setBindGroup(0, this.bindgroup);

    pass_encoder.draw(
      this.component_parameter.width * 6,
      this.component_parameter.height
    );
  };
}

///////////////////////		part	constructor		//////////////////////////////////
function construct_part(my_render, my_part_parameter) {
  this.render = my_render;
  this.part_parameter = my_part_parameter;

  this.webgpu = this.render.webgpu;

  this.create = async function () {
    return this;
  };

  this.create_component = async function (my_component_parameter) {
    return new construct_component(this, my_component_parameter).create();
  };
}

///////////////////////		render	constructor		//////////////////////////////////

function construct_render(my_webgpu, my_render_parameter) {
  this.webgpu = my_webgpu;
  this.render_parameter = my_render_parameter;

  this.create = async function () {
    var my_bindgroup_layout_entries = [
      // component_information
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {},
      },
      {
        //texture
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        texture: {},
      },
      {
        //sampler
        binding: 2,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        sampler: {},
      },
    ];
    var my_bindgroup_layout = this.webgpu.device.createBindGroupLayout({
      entries: my_bindgroup_layout_entries,
    });
    var my_pipeline_layout = this.webgpu.device.createPipelineLayout({
      bindGroupLayouts: [my_bindgroup_layout],
    });
    var server_promise = await fetch(this.render_parameter.shader_url);
    if (!server_promise.ok) {
      alert("execute shader fetch,status is " + server_promise.status);
      return null;
    }
    var shader_text = await server_promise.text();
    var shader_module = this.webgpu.device.createShaderModule({
      code: shader_text,
    });

    var my_pipeline = this.webgpu.device.createRenderPipeline({
      layout: my_pipeline_layout,

      vertex: {
        module: shader_module,
        entryPoint: "vertex_main",
        buffers: [],
      },
      fragment: {
        module: shader_module,
        entryPoint: "fragment_main",
        targets: [
          {
            format: this.webgpu.gpu.getPreferredCanvasFormat(),
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
      depthStencil: {
        format: "depth24plus-stencil8",

        depthWriteEnabled: true,
        depthCompare: "less",

        stencilFront: {},
        stencilBack: {},

        stencilReadMask: 0x01,
        stencilWriteMask: 0x01,
      },
    });

    this.bindgroup_layout = my_bindgroup_layout;
    this.pipeline = my_pipeline;

    return this;
  };
  this.create_part = async function (my_part_parameter) {
    return await new construct_part(this, my_part_parameter).create();
  };
}

export const create_render = async function (my_webgpu, my_render_parameter) {
  return await new construct_render(my_webgpu, my_render_parameter).create();
};
