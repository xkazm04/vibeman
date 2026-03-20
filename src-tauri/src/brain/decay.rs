//! Signal Decay Processing (Item 9)
//!
//! Exponential weight decay with Rayon parallel processing.
//! Replaces: single-threaded JS loop in /api/brain/signals/decay

use rayon::prelude::*;

/// Signal data for batch decay processing
pub struct SignalDecayInput {
    pub id: String,
    pub weight: f64,
    pub age_days: f64,
}

pub struct DecayResult {
    /// Signals with updated weights (above minimum threshold)
    pub updated: Vec<(String, f64)>,
    /// Signal IDs that have fully decayed (below threshold, should be deleted)
    pub expired: Vec<String>,
}

const SIGNAL_MIN_WEIGHT: f64 = 0.01;

/// Batch decay computation using Rayon parallel chunks.
///
/// Algorithm: weight *= decay_factor^(effective_age / retention_days)
/// where effective_age = max(0, age - retention_days * decay_start_fraction)
pub fn batch_decay(
    signals: &[SignalDecayInput],
    decay_factor: f64,
    retention_days: f64,
    decay_start_fraction: f64,
) -> DecayResult {
    let decay_start = retention_days * decay_start_fraction;

    let results: Vec<(String, f64, bool)> = signals
        .par_iter()
        .map(|signal| {
            // Hard delete if beyond retention window
            if signal.age_days > retention_days {
                return (signal.id.clone(), 0.0, true);
            }

            // No decay before start fraction
            if signal.age_days < decay_start {
                return (signal.id.clone(), signal.weight, false);
            }

            // Exponential decay
            let effective_age = signal.age_days - decay_start;
            let decay_exponent = effective_age / (retention_days - decay_start);
            let new_weight = signal.weight * decay_factor.powf(decay_exponent);

            let expired = new_weight < SIGNAL_MIN_WEIGHT;
            (signal.id.clone(), new_weight, expired)
        })
        .collect();

    let mut updated = Vec::new();
    let mut expired = Vec::new();

    for (id, weight, is_expired) in results {
        if is_expired {
            expired.push(id);
        } else {
            updated.push((id, weight));
        }
    }

    DecayResult { updated, expired }
}
