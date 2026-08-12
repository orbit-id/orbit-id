//! Orbit ID v2: unsigned 128-bit, time-sortable identifiers.
//!
//! The crate root is Orbit ID v2; [`v2`] is an alias of the root module API, and [`v1`]
//! keeps the 64-bit layout.

pub mod v1;
pub mod v2;

pub use v2::*;

use std::error::Error;
use std::fmt;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const ORBIT_EPOCH_UNIX_MS: u64 = 1_767_225_600_000;
pub const DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS: u64 = 5_000;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OrbitErrorCode {
    InvalidType,
    InvalidNode,
    InvalidSequence,
    InvalidTimestamp,
    InvalidDecimal,
    /// Unknown / reserved FormatVersion (v2).
    InvalidFormatVersion,
    /// Region field out of range (v2).
    InvalidRegion,
    /// Tenant field out of range (v2).
    InvalidTenant,
    /// Non-zero Reserved on encode, or rejected on strict decode (v2).
    InvalidReserved,
    ClockRollback,
    SequenceExhausted,
    NodeOwnershipLost,
}

impl OrbitErrorCode {
    /// The stable cross-language error code used by Orbit ID v1.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::InvalidType => "INVALID_TYPE",
            Self::InvalidNode => "INVALID_NODE",
            Self::InvalidSequence => "INVALID_SEQUENCE",
            Self::InvalidTimestamp => "INVALID_TIMESTAMP",
            Self::InvalidDecimal => "INVALID_DECIMAL",
            Self::InvalidFormatVersion => "INVALID_FORMAT_VERSION",
            Self::InvalidRegion => "INVALID_REGION",
            Self::InvalidTenant => "INVALID_TENANT",
            Self::InvalidReserved => "INVALID_RESERVED",
            Self::ClockRollback => "CLOCK_ROLLBACK",
            Self::SequenceExhausted => "SEQUENCE_EXHAUSTED",
            Self::NodeOwnershipLost => "NODE_OWNERSHIP_LOST",
        }
    }
}

impl fmt::Display for OrbitErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OrbitError {
    pub code: OrbitErrorCode,
    message: String,
}

impl OrbitError {
    pub fn new(code: OrbitErrorCode, message: impl Into<String>) -> Self {
        Self { code, message: message.into() }
    }
}

impl fmt::Display for OrbitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl Error for OrbitError {}

/// A clock returning milliseconds relative to the Orbit epoch.
pub trait OrbitClock: Send + Sync {
    fn current_orbit_timestamp_ms(&self) -> i64;
}

impl<F> OrbitClock for F
where
    F: Fn() -> i64 + Send + Sync,
{
    fn current_orbit_timestamp_ms(&self) -> i64 {
        self()
    }
}

#[derive(Debug, Default)]
pub struct SystemOrbitClock;

impl OrbitClock for SystemOrbitClock {
    fn current_orbit_timestamp_ms(&self) -> i64 {
        let unix_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or(Duration::ZERO)
            .as_millis() as i128;
        (unix_ms - i128::from(ORBIT_EPOCH_UNIX_MS)) as i64
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SequenceExhaustedMode {
    Wait,
    Fail,
}
