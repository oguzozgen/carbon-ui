import { IDisposable, RuntimeTSDefinition } from "carbon-core";

var CompilerWorker: any = require("worker-loader!./CompilerWorker.w");
var defaultLib = require("raw-loader!../../node_modules/typescript/lib/lib.d.ts");
var platformLib = require("raw-loader!../editor/model/platform.d.ts");


export class CompilerService implements IDisposable {
    _worker: Worker = new CompilerWorker();
    _tasks = new Map<string, { resolve: (e: any) => void, reject: (e: any) => void }>();

    _onCompilerMessage = (e: MessageEvent) => {
        let fileName = e.data.fileName;
        if (fileName) {
            let callbacks = this._tasks.get(fileName);
            if (callbacks) {
                this._tasks.delete(fileName);
                if (e.data.error) {
                    callbacks.reject(e.data);
                } else {
                    callbacks.resolve(e.data.text);
                }
            }
        }
    }

    constructor() {
        this._worker.onmessage = this._onCompilerMessage;
        this._addFile("lib.d.ts", defaultLib);
        this._addFile("carbon-runtime.d.ts", RuntimeTSDefinition);
        this._addFile("platform.d.ts", platformLib);
    }

    private _addFile(fileName, text) {
        this._worker.postMessage({ fileName, text });
    }

    compile(fileName: string, text: string): Promise<string> {
        let promise = new Promise<string>((resolve, reject) => {
            this._tasks.set(fileName, { resolve, reject });
            this._addFile(fileName, text);
        });

        return promise;
    }

    clear() {
        //todo
    }

    dispose() {
        if (this._worker) {
            this._worker.terminate();
            this._worker = null;
        }
    }
}
