// @ts-check
import ts from "rollup-plugin-ts";

/** @type {import("rollup").RollupOptions} */
export default {
  input: 'src/index.ts',
  output: { 
    file: 'build/index.cjs',
    format: "cjs"
  },
  plugins: [ts()],
};

//export default {
//  input: 'src/test.ts',
//  output: { file: 'testing.js' },
//  plugins: [ts()],
//};