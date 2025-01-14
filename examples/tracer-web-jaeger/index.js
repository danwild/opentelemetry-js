const opentelemetry = require('@opentelemetry/core');
const { BasicTracer, BatchSpanProcessor, SimpleSpanProcessor } = require('@opentelemetry/tracing');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');

const options = {
  url: 'http://localhost:8888/http://host.docker.internal:9411/api/v2/spans',
  serviceName: 'my-service'
}

const exporter = new ZipkinExporter(options);
const tracer = new BasicTracer();

// Configure span processor to send spans to the provided exporter
tracer.addSpanProcessor(new SimpleSpanProcessor(exporter));

// Initialize the OpenTelemetry APIs to use the BasicTracer bindings
opentelemetry.initGlobalTracer(tracer);

// Create a span. A span must be closed.
const span = opentelemetry.getTracer().startSpan('main');
for (let i = 0; i < 10; i++) {
  doWork(span);
}
// Be sure to end the span.
span.end();

// flush and close the connection.
exporter.shutdown();

function doWork(parent) {
  // Start another span. In this example, the main method already started a
  // span, so that'll be the parent span, and this will be a child span.
  const span = opentelemetry.getTracer().startSpan('doWork', {
    parent: parent
  });

  // simulate some random work.
  for (let i = 0; i <= Math.floor(Math.random() * 40000000); i++) { }

  // Set attributes to the span.
  span.setAttribute('key', 'value');

  // Annotate our span to capture metadata about our operation
  span.addEvent('invoking doWork').end();
}
