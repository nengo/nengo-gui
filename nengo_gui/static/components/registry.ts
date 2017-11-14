import { Component } from "./base";
import { Connection } from "../server";

type C = new (argobj) => Component;

export const ComponentRegistry: {[name: string]: C} = {};

export function registerComponent(name: string, compClass: C) {
    ComponentRegistry[name] = compClass;
}

export function createComponent(name, argobj: any) {
    return new ComponentRegistry[name](argobj);
}
