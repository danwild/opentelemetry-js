/*!
 * Copyright 2019, OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import axios from 'axios';
import * as types from '@opentelemetry/types';
import { NoopLogger } from '@opentelemetry/core';
import { SpanExporter, ReadableSpan } from '@opentelemetry/tracing';
import { ExportResult } from '@opentelemetry/base';
import * as zipkinTypes from './types';
import {
  toZipkinSpan,
  statusCodeTagName,
  statusDescriptionTagName,
} from './transform';
/**
 * Zipkin Exporter
 */
export class ZipkinExporter implements SpanExporter {
  static readonly DEFAULT_URL = 'http://localhost:9411/api/v2/spans';
  private readonly _forceFlush: boolean;
  private readonly _logger: types.Logger;
  private readonly _serviceName: string;
  private readonly _statusCodeTagName: string;
  private readonly _statusDescriptionTagName: string;
  private readonly _urlStr: string;

  constructor(config: zipkinTypes.ExporterConfig) {
    this._urlStr = config.url || ZipkinExporter.DEFAULT_URL;
  
    this._forceFlush = config.forceFlush || true;
    this._logger = config.logger || new NoopLogger();
    this._serviceName = config.serviceName;
    this._statusCodeTagName = config.statusCodeTagName || statusCodeTagName;
    this._statusDescriptionTagName =
      config.statusDescriptionTagName || statusDescriptionTagName;
  }

  /**
   * Export spans.
   */
  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ) {
    return this._sendSpans(spans, resultCallback);
  }

  /**
   * Shutdown exporter. Noop operation in this exporter.
   */
  shutdown() {
    // Make an optimistic flush.
    if (this._forceFlush) {
      // @todo get spans from span processor (batch)
      this._sendSpans([]);
    }
  }

  /**
   * Transforms an OpenTelemetry span to a Zipkin span.
   */
  private _toZipkinSpan(span: ReadableSpan): zipkinTypes.Span {
    return toZipkinSpan(
      span,
      this._serviceName,
      this._statusCodeTagName,
      this._statusDescriptionTagName
    );
  }

  /**
   * Transform spans and sends to Zipkin service.
   */
  private _sendSpans(
    spans: ReadableSpan[],
    done?: (result: ExportResult) => void
  ) {
    const zipkinSpans = spans.map(span => this._toZipkinSpan(span));
    return this._send(zipkinSpans, (result: ExportResult) => {
      if (done) {
        return done(result);
      }
    });
  }

  /**
   * Send spans to the remote Zipkin service.
   */
  private async _send(
    zipkinSpans: zipkinTypes.Span[],
    done: (result: ExportResult) => void
  ) {
    if (zipkinSpans.length === 0) {
      this._logger.debug('Zipkin send with empty spans');
      return done(ExportResult.SUCCESS);
    }

    axios.post(this._urlStr, zipkinSpans).catch(e => this._logger.error(`axios.post threw error ${this._urlStr}`, e));
  }
}
