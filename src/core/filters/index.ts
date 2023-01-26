import { dropRight, inRange } from "lodash";

import { atom } from "../utils/atoms";
import { Producer, producerToAction } from "../utils/reducers";
import { FilterType, FiltersState } from "./types";
import { getEmptyFiltersState, serializeFiltersState } from "./utils";
import { graphDatasetAtom, refreshSigmaGraph } from "../graph";

/**
 * Producers:
 * **********
 */
export const addFilter: Producer<FiltersState, [FilterType]> = (filter) => {
  return (state) => ({
    ...state,
    past: state.past.concat(filter),
  });
};

export const resetFilters: Producer<FiltersState> = () => {
  return () => ({ past: [], future: [] });
};

export const openPastFilter: Producer<FiltersState, [number]> = (index) => {
  return (state) => {
    if (!inRange(index, 0, state.past.length - 1))
      throw new Error(`openPastFilter: Index ${index} is out of bounds of past filters.`);

    return {
      ...state,
      past: state.past.slice(0, index + 1),
      future: state.past.slice(index + 1).concat(state.future),
    };
  };
};

export const openFutureFilter: Producer<FiltersState, [number]> = (index) => {
  return (state) => {
    if (!inRange(index, 0, state.future.length))
      throw new Error(`openFutureFilter: Index ${index} is out of bounds of future filters.`);

    return {
      ...state,
      past: state.past.concat(state.future.slice(0, index + 1)),
      future: state.future.slice(index + 1),
    };
  };
};

export const openAllFutureFilters: Producer<FiltersState> = () => {
  return (state) => {
    return {
      ...state,
      past: state.past.concat(state.future),
      future: [],
    };
  };
};

export const deleteCurrentFilter: Producer<FiltersState> = () => {
  return (state) => {
    if (!state.past.length) throw new Error(`deleteCurrentFilter: There is not filter to delete.`);

    return {
      ...state,
      past: dropRight(state.past, 1),
    };
  };
};

export const replaceCurrentFilter: Producer<FiltersState, [FilterType]> = (filter) => {
  return (state) => ({
    ...state,
    past: dropRight(state.past, 1).concat(filter),
  });
};

/**
 * Public API:
 * ***********
 */
export const filtersAtom = atom<FiltersState>(getEmptyFiltersState());

export const filtersActions = {
  addFilter: producerToAction(addFilter, filtersAtom),
  resetFilters: producerToAction(resetFilters, filtersAtom),
  openPastFilter: producerToAction(openPastFilter, filtersAtom),
  openFutureFilter: producerToAction(openFutureFilter, filtersAtom),
  openAllFutureFilters: producerToAction(openAllFutureFilters, filtersAtom),
  replaceCurrentFilter: producerToAction(replaceCurrentFilter, filtersAtom),
  deleteCurrentFilter: producerToAction(deleteCurrentFilter, filtersAtom),
} as const;

/**
 * Bindings:
 * *********
 */
filtersAtom.bind((filtersState) => {
  sessionStorage.setItem("filters", serializeFiltersState(filtersState));

  refreshSigmaGraph(graphDatasetAtom.get(), filtersState);
});
