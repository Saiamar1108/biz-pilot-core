import { ACTIONS, EVENTS, Joyride, STATUS, type EventData } from "react-joyride";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import {
  createProductStepIndex,
  ONBOARDING_CLOSE_NAV_EVENT,
  ONBOARDING_OPEN_NAV_EVENT,
  ONBOARDING_START_DELAY_MS,
  ONBOARDING_TARGET_WAIT_MS,
  onboardingSteps,
} from "@/lib/onboarding-tour";

type OnboardingContextValue = {
  replayTutorial: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);
const TOUR_Z_INDEX = 2147483000;

function getStepTarget(index: number) {
  const target = onboardingSteps[index]?.target;
  if (typeof target !== "string") return null;
  return document.querySelector(target);
}

function waitForStepTarget(index: number, timeoutMs = ONBOARDING_TARGET_WAIT_MS) {
  const start = Date.now();

  return new Promise<boolean>((resolve) => {
    const check = () => {
      if (getStepTarget(index)) {
        resolve(true);
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        resolve(false);
        return;
      }

      window.setTimeout(check, 100);
    };

    check();
  });
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { isAuthenticated, loading, markOnboardingComplete, user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const autoStartedUserId = useRef<string | null>(null);
  const completingRef = useRef(false);

  const closeMobileNav = useCallback(() => {
    window.dispatchEvent(new Event(ONBOARDING_CLOSE_NAV_EVENT));
  }, []);

  const openMobileNav = useCallback(() => {
    window.dispatchEvent(new Event(ONBOARDING_OPEN_NAV_EVENT));
  }, []);

  const startTutorial = useCallback(
    () => {
      if (!isAuthenticated) return;
      setRun(false);
      setStepIndex(0);
      if (pathname !== "/dashboard") {
        void navigate({ to: "/dashboard" });
      }
      window.setTimeout(async () => {
        const targetReady = await waitForStepTarget(0);
        if (!targetReady) return;
        openMobileNav();
        setRun(true);
      }, ONBOARDING_START_DELAY_MS);
    },
    [isAuthenticated, navigate, openMobileNav, pathname],
  );

  useEffect(() => {
    if (loading || !isAuthenticated || !user) return;
    if (user.onboardingCompleted) return;
    if (autoStartedUserId.current === user.id) return;

    autoStartedUserId.current = user.id;
    startTutorial();
  }, [isAuthenticated, loading, startTutorial, user]);

  useEffect(() => {
    if (!run) return;
    if (stepIndex > 0 && stepIndex < createProductStepIndex) {
      openMobileNav();
    } else {
      closeMobileNav();
    }
  }, [closeMobileNav, openMobileNav, run, stepIndex]);

  const persistCompletion = useCallback(async () => {
    if (completingRef.current || !user || user.onboardingCompleted) return;

    completingRef.current = true;
    try {
      await markOnboardingComplete();
    } finally {
      completingRef.current = false;
    }
  }, [markOnboardingComplete, user]);

  const stopTutorial = useCallback(
    (shouldPersist: boolean) => {
      setRun(false);
      setStepIndex(0);
      closeMobileNav();
      if (shouldPersist) {
        void persistCompletion();
      }
    },
    [closeMobileNav, persistCompletion],
  );

  const handleJoyrideCallback = useCallback(
    (data: EventData) => {
      const { action, index, status, type } = data;
      const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

      if (finishedStatuses.includes(status)) {
        stopTutorial(true);
        return;
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        setRun(false);
        if (index === createProductStepIndex && pathname !== "/inventory") {
          void navigate({ to: "/inventory" });
          window.setTimeout(async () => {
            const targetReady = await waitForStepTarget(createProductStepIndex);
            if (!targetReady) {
              stopTutorial(false);
              return;
            }
            setStepIndex(createProductStepIndex);
            setRun(true);
          }, ONBOARDING_START_DELAY_MS);
          return;
        }

        window.setTimeout(async () => {
          const targetReady = await waitForStepTarget(index);
          if (targetReady) {
            setStepIndex(index);
            setRun(true);
            return;
          }

          const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
          if (nextIndex < 0 || nextIndex >= onboardingSteps.length) {
            stopTutorial(false);
            return;
          }

          setStepIndex(nextIndex);
          setRun(true);
        }, ONBOARDING_START_DELAY_MS);
        return;
      }

      if (type !== EVENTS.STEP_AFTER) return;

      if (action === ACTIONS.CLOSE || action === ACTIONS.SKIP) {
        stopTutorial(true);
        return;
      }

      if (index === createProductStepIndex && action === ACTIONS.NEXT) {
        stopTutorial(true);
        return;
      }

      if (index === createProductStepIndex && action === ACTIONS.PREV) {
        setRun(false);
        void navigate({ to: "/dashboard" });
        window.setTimeout(async () => {
          openMobileNav();
          const targetReady = await waitForStepTarget(createProductStepIndex - 1);
          if (!targetReady) {
            stopTutorial(false);
            return;
          }
          setStepIndex(createProductStepIndex - 1);
          setRun(true);
        }, ONBOARDING_START_DELAY_MS);
        return;
      }

      if (index === createProductStepIndex - 1 && action === ACTIONS.NEXT) {
        setRun(false);
        closeMobileNav();
        void navigate({ to: "/inventory" });
        window.setTimeout(async () => {
          const targetReady = await waitForStepTarget(createProductStepIndex);
          if (!targetReady) {
            stopTutorial(false);
            return;
          }
          setStepIndex(createProductStepIndex);
          setRun(true);
        }, ONBOARDING_START_DELAY_MS);
        return;
      }

      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    },
    [closeMobileNav, navigate, pathname, stopTutorial],
  );

  const value = useMemo(
    () => ({
      replayTutorial: startTutorial,
    }),
    [startTutorial],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        disableOverlayClose
        disableScrolling={false}
        floaterProps={{ disableAnimation: false }}
        hideCloseButton={false}
        locale={{ back: "Back", close: "Skip tutorial", last: "Finish tutorial", next: "Next", skip: "Skip tutorial" }}
        run={run}
        scrollDuration={450}
        scrollOffset={90}
        scrollToFirstStep
        showSkipButton
        spotlightClicks
        stepIndex={stepIndex}
        steps={onboardingSteps}
        styles={{
          options: {
            arrowColor: "var(--popover)",
            backgroundColor: "var(--popover)",
            overlayColor: "rgba(15, 23, 42, 0.58)",
            primaryColor: "var(--primary)",
            textColor: "var(--popover-foreground)",
            width: 360,
            zIndex: TOUR_Z_INDEX,
          },
          buttonBack: {
            color: "var(--muted-foreground)",
            marginRight: 8,
          },
          buttonPrimary: {
            borderRadius: 8,
            color: "var(--primary-foreground)",
          },
          buttonSkip: {
            color: "var(--muted-foreground)",
          },
          tooltip: {
            borderRadius: 12,
            zIndex: TOUR_Z_INDEX,
          },
          floater: {
            zIndex: TOUR_Z_INDEX,
          },
          overlay: {
            zIndex: TOUR_Z_INDEX - 2,
          },
          spotlight: {
            zIndex: TOUR_Z_INDEX - 1,
          },
          tooltipContent: {
            fontSize: 14,
            lineHeight: 1.5,
            padding: "8px 0 14px",
          },
        }}
      />
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
