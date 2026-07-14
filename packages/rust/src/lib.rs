//! Orbit ID v1: a 64-bit, time-sortable identifier.

use std::error::Error;
use std::fmt;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub const ORBIT_EPOCH_UNIX_MS: u64 = 1_767_225_600_000;
pub const TIMESTAMP_BITS: u8 = 41;
pub const TYPE_BITS: u8 = 6;
pub const NODE_BITS: u8 = 7;
pub const SEQUENCE_BITS: u8 = 10;
pub const TIMESTAMP_SHIFT: u8 = 23;
pub const TYPE_SHIFT: u8 = 17;
pub const NODE_SHIFT: u8 = 10;
pub const MAX_TIMESTAMP: u64 = (1 << TIMESTAMP_BITS) - 1;
pub const MAX_TYPE: u8 = (1 << TYPE_BITS) - 1;
pub const MAX_NODE: u8 = (1 << NODE_BITS) - 1;
pub const MAX_SEQUENCE: u16 = (1 << SEQUENCE_BITS) - 1;
pub const DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS: u64 = 5_000;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OrbitErrorCode {
    InvalidType,
    InvalidNode,
    InvalidSequence,
    InvalidTimestamp,
    InvalidDecimal,
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

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OrbitFields {
    /// Milliseconds elapsed since [`ORBIT_EPOCH_UNIX_MS`].
    pub timestamp: u64,
    pub r#type: u8,
    pub node: u8,
    pub sequence: u16,
}

pub fn encode(fields: OrbitFields) -> Result<u64, OrbitError> {
    if fields.timestamp > MAX_TIMESTAMP {
        return Err(OrbitError::new(OrbitErrorCode::InvalidTimestamp, "timestamp out of range"));
    }
    if fields.r#type > MAX_TYPE {
        return Err(OrbitError::new(OrbitErrorCode::InvalidType, "type out of range"));
    }
    if fields.node > MAX_NODE {
        return Err(OrbitError::new(OrbitErrorCode::InvalidNode, "node out of range"));
    }
    if fields.sequence > MAX_SEQUENCE {
        return Err(OrbitError::new(OrbitErrorCode::InvalidSequence, "sequence out of range"));
    }
    Ok((fields.timestamp << TIMESTAMP_SHIFT)
        | (u64::from(fields.r#type) << TYPE_SHIFT)
        | (u64::from(fields.node) << NODE_SHIFT)
        | u64::from(fields.sequence))
}

/// Decodes a `u64` Orbit ID. Any `u64` is a valid bit layout.
pub const fn decode(id: u64) -> OrbitFields {
    OrbitFields {
        timestamp: (id >> TIMESTAMP_SHIFT) & MAX_TIMESTAMP,
        r#type: ((id >> TYPE_SHIFT) & MAX_TYPE as u64) as u8,
        node: ((id >> NODE_SHIFT) & MAX_NODE as u64) as u8,
        sequence: (id & MAX_SEQUENCE as u64) as u16,
    }
}

pub fn parse(input: &str) -> Result<OrbitFields, OrbitError> {
    Ok(decode(from_decimal_string(input)?))
}

pub fn from_decimal_string(input: &str) -> Result<u64, OrbitError> {
    if input.is_empty() {
        return Err(OrbitError::new(OrbitErrorCode::InvalidDecimal, "empty decimal string"));
    }
    if !input.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(OrbitError::new(OrbitErrorCode::InvalidDecimal, "non-canonical decimal string"));
    }
    if input.len() > 1 && input.starts_with('0') {
        return Err(OrbitError::new(OrbitErrorCode::InvalidDecimal, "leading zeros are not canonical"));
    }
    input.parse::<u64>().map_err(|_| {
        OrbitError::new(OrbitErrorCode::InvalidDecimal, "decimal value outside unsigned 64-bit range")
    })
}

pub fn to_decimal_string(id: u64) -> String {
    id.to_string()
}

pub fn to_hex_string(id: u64) -> String {
    format!("0x{id:016x}")
}

pub fn is_valid(input: &str) -> bool {
    from_decimal_string(input).is_ok()
}

pub const fn get_timestamp(id: u64) -> u64 {
    decode(id).timestamp
}

pub const fn get_type(id: u64) -> u8 {
    decode(id).r#type
}

pub const fn get_node(id: u64) -> u8 {
    decode(id).node
}

pub const fn get_sequence(id: u64) -> u16 {
    decode(id).sequence
}

pub const fn to_unix_time_ms(timestamp: u64) -> u64 {
    timestamp + ORBIT_EPOCH_UNIX_MS
}

pub fn from_unix_time_ms(unix_ms: u64) -> Result<u64, OrbitError> {
    unix_ms.checked_sub(ORBIT_EPOCH_UNIX_MS).ok_or_else(|| {
        OrbitError::new(OrbitErrorCode::InvalidTimestamp, "time precedes Orbit epoch")
    })
}

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

pub struct GeneratorOptions {
    pub node: u8,
    pub clock: Arc<dyn OrbitClock>,
    pub clock_rollback_tolerance_ms: u64,
    pub on_sequence_exhausted: SequenceExhaustedMode,
    pub confirm_ownership: Option<Arc<dyn Fn() -> bool + Send + Sync>>,
}

impl GeneratorOptions {
    pub fn new(node: u8) -> Self {
        Self {
            node,
            clock: Arc::new(SystemOrbitClock),
            clock_rollback_tolerance_ms: DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS,
            on_sequence_exhausted: SequenceExhaustedMode::Wait,
            confirm_ownership: None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum GenerateDecision {
    Issue { timestamp: u64, sequence: u16 },
    Wait { wait_until_timestamp: u64 },
    WaitNextMs { from_timestamp: u64 },
    Error { error: OrbitErrorCode },
}

#[derive(Clone, Copy, Debug)]
struct GeneratorState {
    last_timestamp: Option<u64>,
    sequence: u16,
}

/// Thread-safe synchronous Orbit ID generator.
pub struct OrbitGenerator {
    node: u8,
    clock: Arc<dyn OrbitClock>,
    clock_rollback_tolerance_ms: u64,
    on_sequence_exhausted: SequenceExhaustedMode,
    confirm_ownership: Option<Arc<dyn Fn() -> bool + Send + Sync>>,
    state: Mutex<GeneratorState>,
}

impl OrbitGenerator {
    pub fn new(options: GeneratorOptions) -> Result<Self, OrbitError> {
        if options.node > MAX_NODE {
            return Err(OrbitError::new(OrbitErrorCode::InvalidNode, "node out of range"));
        }
        Ok(Self {
            node: options.node,
            clock: options.clock,
            clock_rollback_tolerance_ms: options.clock_rollback_tolerance_ms,
            on_sequence_exhausted: options.on_sequence_exhausted,
            confirm_ownership: options.confirm_ownership,
            state: Mutex::new(GeneratorState { last_timestamp: None, sequence: 0 }),
        })
    }

    pub const fn node(&self) -> u8 {
        self.node
    }

    pub fn last_timestamp(&self) -> u64 {
        self.lock_state().last_timestamp.unwrap_or(0)
    }

    pub fn sequence(&self) -> u16 {
        self.lock_state().sequence
    }

    pub fn restore_state(&self, last_timestamp: u64, sequence: u16) -> Result<(), OrbitError> {
        if last_timestamp > MAX_TIMESTAMP {
            return Err(OrbitError::new(OrbitErrorCode::InvalidTimestamp, "timestamp out of range"));
        }
        if sequence > MAX_SEQUENCE {
            return Err(OrbitError::new(OrbitErrorCode::InvalidSequence, "sequence out of range"));
        }
        *self.lock_state() = GeneratorState { last_timestamp: Some(last_timestamp), sequence };
        Ok(())
    }

    pub fn decide(&self, r#type: u8) -> GenerateDecision {
        self.decide_at(r#type, self.clock.current_orbit_timestamp_ms())
    }

    pub fn decide_at(&self, r#type: u8, now_timestamp: i64) -> GenerateDecision {
        self.decide_with_state(r#type, now_timestamp, *self.lock_state())
    }

    pub fn generate(&self, r#type: u8) -> Result<u64, OrbitError> {
        let mut state = self.lock_state();
        loop {
            let decision = self.decide_with_state(r#type, self.clock.current_orbit_timestamp_ms(), *state);
            match decision {
                GenerateDecision::Issue { timestamp, sequence } => {
                    let id = encode(OrbitFields { timestamp, r#type, node: self.node, sequence })?;
                    *state = GeneratorState { last_timestamp: Some(timestamp), sequence };
                    return Ok(id);
                }
                GenerateDecision::Wait { wait_until_timestamp } => {
                    self.wait_until(|timestamp| {
                        u64::try_from(timestamp).map(|t| t >= wait_until_timestamp).unwrap_or(false)
                    })?;
                }
                GenerateDecision::WaitNextMs { from_timestamp } => {
                    self.wait_until(|timestamp| {
                        u64::try_from(timestamp).map(|t| t > from_timestamp).unwrap_or(false)
                    })?;
                }
                GenerateDecision::Error { error } => {
                    return Err(OrbitError::new(error, format!("generate failed: {error}")));
                }
            }
        }
    }

    fn decide_with_state(&self, r#type: u8, now_timestamp: i64, state: GeneratorState) -> GenerateDecision {
        if self.confirm_ownership.as_ref().is_some_and(|confirm| !confirm()) {
            return GenerateDecision::Error { error: OrbitErrorCode::NodeOwnershipLost };
        }
        if r#type == 0 || r#type > MAX_TYPE {
            return GenerateDecision::Error { error: OrbitErrorCode::InvalidType };
        }
        let Ok(now) = u64::try_from(now_timestamp) else {
            return GenerateDecision::Error { error: OrbitErrorCode::InvalidTimestamp };
        };
        if now > MAX_TIMESTAMP {
            return GenerateDecision::Error { error: OrbitErrorCode::InvalidTimestamp };
        }
        let Some(last_timestamp) = state.last_timestamp else {
            return GenerateDecision::Issue { timestamp: now, sequence: 0 };
        };
        if now < last_timestamp {
            if last_timestamp - now <= self.clock_rollback_tolerance_ms {
                return GenerateDecision::Wait { wait_until_timestamp: last_timestamp };
            }
            return GenerateDecision::Error { error: OrbitErrorCode::ClockRollback };
        }
        if now == last_timestamp {
            if state.sequence >= MAX_SEQUENCE {
                return match self.on_sequence_exhausted {
                    SequenceExhaustedMode::Wait => GenerateDecision::WaitNextMs { from_timestamp: last_timestamp },
                    SequenceExhaustedMode::Fail => GenerateDecision::Error {
                        error: OrbitErrorCode::SequenceExhausted,
                    },
                };
            }
            return GenerateDecision::Issue { timestamp: now, sequence: state.sequence + 1 };
        }
        GenerateDecision::Issue { timestamp: now, sequence: 0 }
    }

    fn wait_until(&self, predicate: impl Fn(i64) -> bool) -> Result<(), OrbitError> {
        let started = Instant::now();
        while !predicate(self.clock.current_orbit_timestamp_ms()) {
            if started.elapsed() > Duration::from_secs(30) {
                return Err(OrbitError::new(OrbitErrorCode::ClockRollback, "timed out waiting for clock to advance"));
            }
            thread::yield_now();
        }
        Ok(())
    }

    fn lock_state(&self) -> std::sync::MutexGuard<'_, GeneratorState> {
        self.state.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}
