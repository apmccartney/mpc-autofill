import { createAsyncThunk } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from "@/app/store";
import { SearchQuery } from "@/common/schema_types";
export type {
  FilterSettings,
  SearchQuery,
  SearchSettings,
  SearchTypeSettings,
  SourceRow,
  SourceSettings,
} from "@/common/schema_types";

type DispatchFunc = () => AppDispatch;
export const useAppDispatch: DispatchFunc = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: string;
  extra: { s: string; n: number };
}>();

export type ThunkStatus = "idle" | "loading" | "succeeded" | "failed";

export type CardType = "CARD" | "CARDBACK" | "TOKEN";
export type Faces = "front" | "back";

export interface APIError {
  name: string | null;
  message: string | null;
}

export interface ThunkStateBase {
  status: ThunkStatus;
  error: APIError | null;
}

export interface CardDocument {
  // This should match the data returned by `to_dict` on the `Card` Django model
  identifier: string;
  card_type: string;
  name: string;
  priority: number;
  source: string;
  source_name: string;
  source_id: number;
  source_verbose: string;
  source_type: string;
  source_external_link: string | null;
  dpi: number;
  searchq: string;
  extension: string;
  date: string; // formatted by backend
  download_link: string;
  size: number;
  small_thumbnail_url: string;
  medium_thumbnail_url: string;
  language: string;
  tags: Array<string>;
}

export interface CardDocuments {
  [key: string]: CardDocument;
}

export interface CardDocumentsState extends ThunkStateBase {
  cardDocuments: CardDocuments;
}

export interface CardbacksState extends ThunkStateBase {
  cardbacks: Array<string>;
}

export type SourceType = "Google Drive" | "Local File" | "AWS S3";

// TODO: create json schemas for these, infer types from them, and see if we can define the schema once between frontend and backend
// TODO: it seems DRF serialisers can accomplish this: https://www.django-rest-framework.org/api-guide/serializers/
export interface SourceDocument {
  // This should match the data returned by `to_dict` on the `Source` Django model
  pk: number;
  key: string;
  name: string;
  identifier: string;
  source_type: SourceType;
  external_link: string | null;
  description: string;
}

export interface SourceDocuments {
  [pk: number]: SourceDocument;
}

export interface SourceDocumentsState extends ThunkStateBase {
  sourceDocuments?: SourceDocuments; // null indicates the data has not yet loaded from the backend
}

export type SearchResultsForQuery = {
  [card_type in CardType]: Array<string>;
};

export interface SearchResults {
  [query: string]: SearchResultsForQuery;
}

export interface SearchResultsState extends ThunkStateBase {
  searchResults: SearchResults;
}

export interface SourceContribution {
  name: string;
  identifier: string;
  source_type: SourceType;
  external_link: string;
  description: string;
  qty_cards: string; // formatted by backend
  qty_cardbacks: string; // formatted by backend
  qty_tokens: string; // formatted by backend
  avgdpi: string; // formatted by backend
  size: string; // formatted by backend
}

export interface Contributions {
  sources: Array<SourceContribution>;
  card_count_by_type: { [card_type in CardType]: number };
  total_database_size: number;
}

export interface PatreonCampaign {
  id: string;
  about: string;
}

export interface PatreonSupporter {
  name: string;
  tier: string;
  date: string;
}

export interface PatreonSupporterTier {
  title: string;
  description: string;
  usd: number;
}

export interface PatreonInfo {
  url: string | null;
  members: Array<PatreonSupporter> | null;
  tiers: { [tierId: string]: PatreonSupporterTier } | null;
  campaign: PatreonCampaign | null;
}

export interface BackendInfo {
  name: string | null;
  description: string | null;
  email: string | null;
  reddit: string | null;
  discord: string | null;
  patreon: PatreonInfo;
}

export interface BackendState {
  url: string | null;
  // TODO: connection status stuff in here probably
}

export interface ImportSite {
  name: string;
  url: string;
}

export interface ProjectMember {
  query: SearchQuery;
  selectedImage?: string;
  selected: boolean;
}

export type SlotProjectMembers = {
  [face in Faces]: ProjectMember | null;
};

export type Project = {
  members: Array<SlotProjectMembers>;
  cardback: string | null;
};

export interface DFCPairs {
  [front: string]: string;
}

export interface ViewSettingsState {
  frontsVisible: boolean;
  sourcesVisible: { [source: string]: boolean };
  facetBySource: boolean;
}

export type Cardstock =
  | "(S30) Standard Smooth"
  | "(S33) Superior Smooth"
  | "(M31) Linen"
  | "(P10) Plastic";

export interface FinishSettingsState {
  cardstock: Cardstock;
  foil: boolean;
}

export type ProcessedLine = [
  number,
  ProjectMember | null,
  ProjectMember | null
];

export interface ToastsState {
  errors: { [key: string]: APIError };
}

export type NewCardsPage = Array<CardDocument>;

export interface NewCardsFirstPage {
  source: SourceDocument;
  hits: number;
  pages: number;
  cards: NewCardsPage;
}

export interface NewCardsFirstPages {
  [sourceKey: string]: NewCardsFirstPage;
}

export type Slots = Array<[Faces, number]>;

export type Modals =
  | "cardDetailedView"
  | "gridSelector"
  | "changeQuery"
  | "supportDeveloper"
  | "supportBackend"
  | "invalidIdentifiers";

export interface ModalsState {
  card: CardDocument | null;
  slots: Slots | null;
  shownModal: Modals | null;
}

export interface InvalidIdentifiersState {
  invalidIdentifiers: Array<{ [face in Faces]: [SearchQuery, string] | null }>;
}

export interface Language {
  name: string;
  code: string;
}

export interface Tag {
  name: string;
  aliases: Array<string>;
  parent: string | null;
  children: Array<Tag>;
}
