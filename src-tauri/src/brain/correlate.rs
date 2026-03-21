//! Correlation Matrix Computation (Item 11)
//!
//! Pearson correlations on bucketed time-series using ndarray.
//! Rayon-parallelized pairwise computation.
//! Replaces: O(n^2) JS loop in correlationEngine.ts

use ndarray::Array1;
use rayon::prelude::*;
use serde::Serialize;
use std::collections::HashMap;

/// Input signal for correlation computation
pub struct SignalPoint {
    pub signal_type: String,
    pub timestamp: i64,   // Unix timestamp
    pub weight: f64,
}

/// Correlation result between two signal types
#[derive(Debug, Clone, Serialize)]
pub struct Correlation {
    pub source: String,
    pub target: String,
    pub coefficient: f64,
    pub strength: String,
    pub sample_count: usize,
    pub score: f64,
}

/// Compute pairwise Pearson correlations across signal types.
///
/// Signals are bucketed into time windows, then pairwise correlations
/// computed using ndarray dot products with Rayon parallelism.
pub fn compute_correlations(
    signals: &[SignalPoint],
    bucket_size_secs: i64,
    min_samples: usize,
) -> Vec<Correlation> {
    if signals.is_empty() {
        return vec![];
    }

    // Find time range
    let min_time = signals.iter().map(|s| s.timestamp).min().unwrap_or(0);
    let max_time = signals.iter().map(|s| s.timestamp).max().unwrap_or(0);
    let num_buckets = ((max_time - min_time) / bucket_size_secs + 1) as usize;

    if num_buckets < min_samples {
        return vec![];
    }

    // Collect unique signal types
    let mut type_set: Vec<String> = signals
        .iter()
        .map(|s| s.signal_type.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    type_set.sort();

    if type_set.len() < 2 {
        return vec![];
    }

    // Build bucketed time series per signal type
    let mut series: HashMap<&str, Vec<f64>> = HashMap::new();
    for t in &type_set {
        series.insert(t.as_str(), vec![0.0; num_buckets]);
    }

    for signal in signals {
        let bucket = ((signal.timestamp - min_time) / bucket_size_secs) as usize;
        if bucket < num_buckets {
            if let Some(s) = series.get_mut(signal.signal_type.as_str()) {
                s[bucket] += signal.weight;
            }
        }
    }

    // Convert to ndarray for fast computation
    let arrays: HashMap<&str, Array1<f64>> = series
        .iter()
        .map(|(k, v)| (*k, Array1::from_vec(v.clone())))
        .collect();

    // Generate all pairs
    let mut pairs: Vec<(&str, &str)> = Vec::new();
    for i in 0..type_set.len() {
        for j in (i + 1)..type_set.len() {
            pairs.push((type_set[i].as_str(), type_set[j].as_str()));
        }
    }

    // Parallel pairwise Pearson correlation
    pairs
        .par_iter()
        .filter_map(|(a, b)| {
            let x = arrays.get(a)?;
            let y = arrays.get(b)?;

            let coeff = pearson_correlation(x, y);
            if coeff.is_nan() {
                return None;
            }

            let abs_coeff = coeff.abs();
            let strength = if abs_coeff >= 0.6 {
                "strong"
            } else if abs_coeff >= 0.3 {
                "moderate"
            } else if abs_coeff >= 0.1 {
                "weak"
            } else {
                return None; // filter out negligible correlations
            };

            let score = abs_coeff * (num_buckets as f64 + 1.0).ln();

            Some(Correlation {
                source: a.to_string(),
                target: b.to_string(),
                coefficient: coeff,
                strength: strength.to_string(),
                sample_count: num_buckets,
                score,
            })
        })
        .collect()
}

/// Pearson correlation coefficient between two arrays
fn pearson_correlation(x: &Array1<f64>, y: &Array1<f64>) -> f64 {
    let n = x.len() as f64;
    let mean_x = x.mean().unwrap_or(0.0);
    let mean_y = y.mean().unwrap_or(0.0);

    let dx = x - mean_x;
    let dy = y - mean_y;

    let numerator = dx.dot(&dy);
    let denom_x = dx.dot(&dx).sqrt();
    let denom_y = dy.dot(&dy).sqrt();

    if denom_x < f64::EPSILON || denom_y < f64::EPSILON {
        return 0.0;
    }

    numerator / (denom_x * denom_y)
}
