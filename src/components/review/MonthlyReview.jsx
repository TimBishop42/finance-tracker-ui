import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  Fade,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { ThemeProvider, createTheme, useTheme } from "@mui/material/styles";
import {
  ArrowBackIos,
  ArrowForwardIos,
  Close,
  PlayArrow,
} from "@mui/icons-material";
import { getMonthlyReview } from "../../services/finance-service";
import { monthLong } from "../wealth/wealthFormat";
import { buildSlides, importedUpTo } from "./reviewSlides";
import { useReducedMotion } from "./useCountUp";

/** "yyyy-MM" shifted by `delta` months. */
const shiftMonth = (month, delta) => {
  const d = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)) - 1 + delta,
    1,
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Full-screen, one-slide-at-a-time walkthrough ("Wrapped" style). Arrow keys,
 * the on-screen buttons, or tapping the left/right of the screen move between
 * slides; Esc closes. Slides render on a dark gradient, so they get a dark theme.
 */
function Walkthrough({ slides, review, onClose }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const outer = useTheme();
  const theme = useMemo(
    () =>
      createTheme(outer, {
        palette: { mode: "dark", background: { paper: "rgba(20,20,30,0.92)" } },
      }),
    [outer],
  );
  const go = useCallback(
    (delta) =>
      setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + delta))),
    [slides.length],
  );

  useEffect(() => {
    // Arrows only: Space/Enter already activate the focused Next/Back button.
    const onKey = (e) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slide = slides[index];
  const last = index === slides.length - 1;
  return (
    <Dialog
      fullScreen
      open
      onClose={onClose}
      PaperProps={{ "aria-label": `${monthLong(review.month)} review` }}
    >
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            color: "common.white",
            background: slide.bg,
            transition: reduceMotion ? "none" : "background 600ms ease",
          }}
        >
          {/* Progress segments, one per slide */}
          <Stack direction="row" spacing={0.5} sx={{ px: 2, pt: 2 }}>
            {slides.map((s, i) => (
              <Box
                key={s.id}
                sx={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  bgcolor:
                    i <= index ? "common.white" : "rgba(255,255,255,0.3)",
                  transition: "background-color 300ms",
                }}
              />
            ))}
          </Stack>
          <Stack direction="row" alignItems="center" sx={{ px: 2, pt: 1 }}>
            <Typography variant="overline" sx={{ flex: 1, opacity: 0.9 }} aria-live="polite">
              {slide.title}, {index + 1} of {slides.length}
            </Typography>
            <IconButton
              aria-label="Close review"
              onClick={onClose}
              sx={{ color: "inherit" }}
            >
              <Close />
            </IconButton>
          </Stack>

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              alignItems: "center",
              px: { xs: 2, md: 6 },
            }}
            onClick={(e) => {
              // Tap the left third to go back, anywhere else to go on — but not on a
              // control or chart legend, or when the click ended a text selection.
              if (e.target.closest("button, a, [role=button], .recharts-legend-wrapper")) return;
              if (window.getSelection()?.toString()) return;
              const { left, width } = e.currentTarget.getBoundingClientRect();
              go(e.clientX - left < width / 3 ? -1 : 1);
            }}
          >
            <Fade key={slide.id} in appear timeout={reduceMotion ? 0 : 600}>
              <Box sx={{ width: "100%", maxWidth: 900, mx: "auto", py: 3 }}>
                <slide.Component review={review} {...slide.props} />
              </Box>
            </Fade>
          </Box>

          <Stack direction="row" justifyContent="space-between" sx={{ p: 2 }}>
            <Button
              color="inherit"
              startIcon={<ArrowBackIos />}
              onClick={() => go(-1)}
              disabled={index === 0}
            >
              Back
            </Button>
            <Typography
              variant="body2"
              sx={{ alignSelf: "center", opacity: 0.7 }}
            >
              {index + 1} / {slides.length}
            </Typography>
            <Button
              color="inherit"
              endIcon={last ? <Close /> : <ArrowForwardIos />}
              onClick={() => (last ? onClose() : go(1))}
            >
              {last ? "Done" : "Next"}
            </Button>
          </Stack>
        </Box>
      </ThemeProvider>
    </Dialog>
  );
}

export default function MonthlyReview() {
  // Reviews usually happen after a month ends, so open on last month.
  const [month, setMonth] = useState(() => shiftMonth(currentMonth(), -1));
  const [review, setReview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReview(null);
    getMonthlyReview(month)
      .then((data) => !cancelled && setReview(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month]);

  const slides = useMemo(() => (review ? buildSlides(review) : []), [review]);

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton
          aria-label="Previous month"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        >
          <ArrowBackIos fontSize="small" />
        </IconButton>
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{ flex: 1, textAlign: "center" }}
        >
          {monthLong(month)}
        </Typography>
        <IconButton
          aria-label="Next month"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={month >= currentMonth()}
        >
          <ArrowForwardIos fontSize="small" />
        </IconButton>
      </Stack>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error">Couldn't load the review: {error}</Alert>
      )}

      {!loading && review && (
        <>
          {importedUpTo(review) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Transactions are only imported up to {importedUpTo(review)} — import the rest of{" "}
              {monthLong(month)} before reviewing it.
            </Alert>
          )}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={() => setWalkthroughOpen(true)}
              sx={{ px: 4, py: 1.5, borderRadius: 8 }}
            >
              Play the {monthLong(month)} review
            </Button>
          </Box>
          <Stack spacing={2}>
            {slides
              .filter((s) => s.id !== "intro" && s.id !== "outro")
              .map((s) => (
                <Card key={s.id} variant="outlined">
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      {s.title}
                    </Typography>
                    <s.Component review={review} {...s.props} />
                  </CardContent>
                </Card>
              ))}
          </Stack>
          {walkthroughOpen && (
            <Walkthrough
              slides={slides}
              review={review}
              onClose={() => setWalkthroughOpen(false)}
            />
          )}
        </>
      )}
    </Box>
  );
}
