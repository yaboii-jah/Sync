"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui";
import styles from "@/app/landing.module.css";

export function LandingMotion() {
  const [paused, setPaused] = useState(false);

  return (
    <>
      <div
        className={styles.glows}
        data-paused={paused}
        aria-hidden="true"
      />
      <Button
        variant="ghost"
        size="sm"
        className={styles.motionControl}
        onPress={() => setPaused((value) => !value)}
        aria-label={paused ? "Resume background animation" : "Pause background animation"}
      >
        {paused ? <Play aria-hidden="true" size={14} /> : <Pause aria-hidden="true" size={14} />}
        {paused ? "Resume animation" : "Pause animation"}
      </Button>
    </>
  );
}
