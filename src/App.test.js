import { render, screen } from "@testing-library/react";
import App from "./App";

// Smoke test of the app shell, not the data: every API call (fetch and the
// shared axios client) resolves empty, so nothing touches the network.
jest.mock("./rest/CategoryClient", () => {
  const empty = () => Promise.resolve({ data: [] });
  return { get: empty, post: empty, put: empty, delete: empty };
});

test("app shell renders without crashing", async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
  );
  render(<App />);
  expect(await screen.findAllByRole("button")).not.toHaveLength(0);
});
