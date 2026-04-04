import { describe, expect, it, vi } from "vitest";
import { LosslessAPI } from "./client";
import type { SearchResponse, Track } from "./types";

function createTrack(
  id: number,
  title: string,
  popularity?: number
): Track {
  return {
    id,
    title,
    duration: 180,
    popularity,
  };
}

function createSearchResponse(
  items: Track[],
  totalNumberOfItems: number = items.length,
  offset: number = 0,
  limit: number = 25
): SearchResponse<Track> {
  return {
    items,
    totalNumberOfItems,
    offset,
    limit,
  };
}

function createApi(): LosslessAPI {
  return new LosslessAPI({
    getInstances: async () => ["https://example.com"],
  });
}

describe("LosslessAPI.searchTracksWithFallback", () => {
  it("bypasses fallback for non-first pages", async () => {
    const api = createApi();
    const response = createSearchResponse(
      [createTrack(1, "Page Two Track", 20)],
      40,
      25,
      25
    );
    const searchTracksSpy = vi
      .spyOn(api, "searchTracks")
      .mockResolvedValue(response);

    const result = await api.searchTracksWithFallback("fein", {
      offset: 25,
      limit: 25,
    });

    expect(searchTracksSpy).toHaveBeenCalledTimes(1);
    expect(searchTracksSpy).toHaveBeenCalledWith("fein", {
      offset: 25,
      limit: 25,
    });
    expect(result).toEqual(response);
  });

  it("sorts first-page exact results by popularity when fallback is not needed", async () => {
    const api = createApi();
    const searchTracksSpy = vi
      .spyOn(api, "searchTracks")
      .mockResolvedValue(
        createSearchResponse(
          [
            createTrack(1, "Lower Popularity", 20),
            createTrack(2, "Highest Popularity", 90),
            createTrack(3, "Middle Popularity", 60),
            createTrack(4, "Fourth", 10),
            createTrack(5, "Fifth", 5),
          ],
          40
        )
      );

    const result = await api.searchTracksWithFallback("Sunflower", {
      limit: 25,
    });

    expect(searchTracksSpy).toHaveBeenCalledTimes(1);
    expect(result.items.map((track) => track.id)).toEqual([2, 3, 1, 4, 5]);
    expect(result.totalNumberOfItems).toBe(40);
  });

  it("merges weak results and ranks stronger title matches ahead of weaker original-query hits", async () => {
    const api = createApi();
    const searchTracksSpy = vi
      .spyOn(api, "searchTracks")
      .mockImplementation(async (query: string) => {
        switch (query) {
          case "Drake ft Lil Wayne":
            return createSearchResponse([createTrack(1, "Exact Result", 10)], 1);
          case "drake feat lil wayne":
            return createSearchResponse(
              [createTrack(2, "Canonical Result", 500)],
              1
            );
          case "drake featuring lil wayne":
            return createSearchResponse(
              [createTrack(3, "Alias Result", 999)],
              1
            );
          case "drake feat little wayne":
            return createSearchResponse([], 0);
          default:
            return createSearchResponse([], 0);
        }
      });

    const result = await api.searchTracksWithFallback("Drake ft Lil Wayne", {
      limit: 25,
    });

    expect(searchTracksSpy).toHaveBeenCalledTimes(4);
    expect(result.items.map((track) => track.id)).toEqual([3, 2, 1]);
    expect(result.totalNumberOfItems).toBe(3);
  });

  it("deduplicates repeated tracks and keeps the best match tier", async () => {
    const api = createApi();
    const searchTracksSpy = vi
      .spyOn(api, "searchTracks")
      .mockImplementation(async (query: string) => {
        switch (query) {
          case "fein":
            return createSearchResponse([createTrack(1, "FE!N", 10)], 1);
          case "fe!n":
            return createSearchResponse(
              [
                createTrack(1, "FE!N", 80),
                createTrack(2, "Second Result", 70),
              ],
              2
            );
          default:
            return createSearchResponse([], 0);
        }
      });

    const result = await api.searchTracksWithFallback("fein", {
      limit: 25,
    });

    expect(searchTracksSpy).toHaveBeenCalledTimes(2);
    expect(result.items.map((track) => track.id)).toEqual([1, 2]);
    expect(result.items[0]?.popularity).toBe(80);
    expect(result.totalNumberOfItems).toBe(2);
  });

  it("falls back when high-count results do not contain a strong title match", async () => {
    const api = createApi();
    const searchTracksSpy = vi
      .spyOn(api, "searchTracks")
      .mockImplementation(async (query: string) => {
        switch (query) {
          case "FEIN":
            return createSearchResponse(
              [
                createTrack(10, "Put It Down (feat. Raymond Fein)", 73),
                createTrack(11, "Dope Friday for Fein", 61),
                createTrack(12, "BABA FEIN", 47),
                createTrack(13, "Again With Fein", 40),
                createTrack(14, "Dreams About Fein", 35),
                createTrack(15, "Time for Fein", 30),
                createTrack(16, "Mister Fein", 25),
                createTrack(17, "Mode of Fein", 20),
                createTrack(18, "City of Fein", 15),
                createTrack(19, "Nights With Fein", 10),
              ],
              300,
              0,
              10
            );
          case "fe!n":
            return createSearchResponse(
              [
                createTrack(1, "FE!N (feat. Playboi Carti)", 90),
                createTrack(2, "FE!N (CHASE B REMIX)", 56),
              ],
              300,
              0,
              10
            );
          default:
            return createSearchResponse([], 0);
        }
      });

    const result = await api.searchTracksWithFallback("FEIN", {
      limit: 10,
    });

    expect(searchTracksSpy).toHaveBeenCalledTimes(2);
    expect(result.items[0]?.title).toContain("FE!N");
    expect(result.items.map((track) => track.id).slice(0, 3)).toEqual([1, 2, 10]);
  });
});
