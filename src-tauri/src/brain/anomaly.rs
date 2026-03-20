//! Streaming Anomaly Detection (Item 10)
//!
//! Welford's online algorithm for incremental Z-score computation.
//! O(1) per signal, constant memory. Replaces batch Z-score in JS.

use serde::Serialize;
use std::collections::HashMap;

const Z_THRESHOLD_WARNING: f64 = 1.5;
const Z_THRESHOLD_CRITICAL: f64 = 2.5;
const MIN_SAMPLES: usize = 5;

/// Rolling statistics using Welford's online algorithm
#[derive(Debug, Clone)]
pub struct RollingStats {
    count: usize,
    mean: f64,
    m2: f64, // sum of squared differences from mean
}

impl RollingStats {
    pub fn new() -> Self {
        Self {
            count: 0,
            mean: 0.0,
            m2: 0.0,
        }
    }

    /// Update statistics with a new value (O(1))
    pub fn update(&mut self, value: f64) {
        self.count += 1;
        let delta = value - self.mean;
        self.mean += delta / self.count as f64;
        let delta2 = value - self.mean;
        self.m2 += delta * delta2;
    }

    /// Compute variance
    pub fn variance(&self) -> f64 {
        if self.count < 2 {
            return 0.0;
        }
        self.m2 / (self.count - 1) as f64
    }

    /// Compute standard deviation
    pub fn std_dev(&self) -> f64 {
        self.variance().sqrt()
    }

    /// Compute Z-score for a given value
    pub fn z_score(&self, value: f64) -> f64 {
        if self.count < MIN_SAMPLES {
            return 0.0; // insufficient data
        }
        let std = self.std_dev();
        if std < f64::EPSILON {
            // Zero variance — flat baseline
            if (value - self.mean).abs() < f64::EPSILON {
                return 0.0;
            }
            return if value > self.mean { 3.0 } else { -3.0 };
        }
        (value - self.mean) / std
    }
}

/// Anomaly detection result
#[derive(Debug, Clone, Serialize)]
pub struct Anomaly {
    pub signal_type: String,
    pub anomaly_type: String,
    pub severity: String,
    pub z_score: f64,
    pub current_value: f64,
    pub baseline_mean: f64,
}

/// Streaming anomaly detector maintaining per-signal-type baselines
pub struct AnomalyDetector {
    baselines: HashMap<String, RollingStats>,
}

impl AnomalyDetector {
    pub fn new() -> Self {
        Self {
            baselines: HashMap::new(),
        }
    }

    /// Check a new signal value against baseline.
    /// Updates the baseline and returns an anomaly if detected.
    pub fn check(&mut self, signal_type: &str, value: f64) -> Option<Anomaly> {
        let stats = self.baselines
            .entry(signal_type.to_string())
            .or_insert_with(RollingStats::new);

        // Compute Z-score BEFORE updating (compare against historical baseline)
        let z = stats.z_score(value);

        // Update baseline with new value
        stats.update(value);

        // Check thresholds
        let abs_z = z.abs();
        if abs_z < Z_THRESHOLD_WARNING {
            return None;
        }

        let severity = if abs_z >= Z_THRESHOLD_CRITICAL {
            "critical"
        } else {
            "warning"
        };

        let anomaly_type = if z > 0.0 {
            "activity_spike"
        } else {
            "activity_drop"
        };

        Some(Anomaly {
            signal_type: signal_type.to_string(),
            anomaly_type: anomaly_type.to_string(),
            severity: severity.to_string(),
            z_score: z,
            current_value: value,
            baseline_mean: stats.mean,
        })
    }

    /// Get current baseline stats for a signal type
    pub fn get_baseline(&self, signal_type: &str) -> Option<(f64, f64, usize)> {
        self.baselines.get(signal_type).map(|s| (s.mean, s.std_dev(), s.count))
    }
}
