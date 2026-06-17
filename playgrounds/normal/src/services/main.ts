import { helper } from "../utils/helper.js";

export const mainService = {
  run: () => {
    console.log("Service running with", helper());
  }
};

export const unusedService = {
  run: () => console.log("I am never called")
};
