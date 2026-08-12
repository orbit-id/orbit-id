//! Orbit ID v2 Draft: unsigned 128-bit, time-sortable identifiers.

use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

pub use crate::{
    OrbitClock, OrbitError, OrbitErrorCode, SequenceExhaustedMode, SystemOrbitClock,
    DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS, ORBIT_EPOCH_UNIX_MS,
};

pub const FORMAT_VERSION_BITS: u32 = 4;
pub const TIMESTAMP_BITS: u32 = 48;
pub const TYPE_BITS: u32 = 16;
pub const NODE_BITS: u32 = 16;
pub const SEQUENCE_BITS: u32 = 16;
pub const REGION_BITS: u32 = 4;
pub const TENANT_BITS: u32 = 16;
pub const RESERVED_BITS: u32 = 8;

pub const FORMAT_VERSION_SHIFT: u32 = 124;
pub const TIMESTAMP_SHIFT: u32 = 76;
pub const TYPE_SHIFT: u32 = 60;
pub const NODE_SHIFT: u32 = 44;
pub const SEQUENCE_SHIFT: u32 = 28;
pub const REGION_SHIFT: u32 = 24;
pub const TENANT_SHIFT: u32 = 8;

pub const FORMAT_VERSION_MASK: u128 = (1 << FORMAT_VERSION_BITS) - 1;
pub const TIMESTAMP_MASK: u128 = (1 << TIMESTAMP_BITS) - 1;
pub const TYPE_MASK: u128 = (1 << TYPE_BITS) - 1;
pub const NODE_MASK: u128 = (1 << NODE_BITS) - 1;
pub const SEQUENCE_MASK: u128 = (1 << SEQUENCE_BITS) - 1;
pub const REGION_MASK: u128 = (1 << REGION_BITS) - 1;
pub const TENANT_MASK: u128 = (1 << TENANT_BITS) - 1;
pub const RESERVED_MASK: u128 = (1 << RESERVED_BITS) - 1;

pub const MAX_TIMESTAMP: u64 = TIMESTAMP_MASK as u64;
pub const MAX_TYPE: u16 = TYPE_MASK as u16;
pub const MAX_NODE: u16 = NODE_MASK as u16;
pub const MAX_SEQUENCE: u16 = SEQUENCE_MASK as u16;
pub const MAX_REGION: u8 = REGION_MASK as u8;
pub const MAX_TENANT: u16 = TENANT_MASK as u16;
pub const MAX_RESERVED: u8 = RESERVED_MASK as u8;

/// Issued Orbit ID v2 values MUST use FormatVersion = 1.
pub const ISSUED_FORMAT_VERSION: u8 = 1;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct OrbitFields {
    pub format_version: u8,
    pub timestamp: u64,
    pub r#type: u16,
    pub node: u16,
    pub sequence: u16,
    pub region: u8,
    pub tenant: u16,
    pub reserved: u8,
}

pub fn encode(fields: OrbitFields) -> Result<u128, OrbitError> {
    if fields.format_version != ISSUED_FORMAT_VERSION {
        return Err(OrbitError::new(
            OrbitErrorCode::InvalidFormatVersion,
            format!("formatVersion must be {ISSUED_FORMAT_VERSION}: {}", fields.format_version),
        ));
    }
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
    if fields.region > MAX_REGION {
        return Err(OrbitError::new(OrbitErrorCode::InvalidRegion, "region out of range"));
    }
    if fields.tenant > MAX_TENANT {
        return Err(OrbitError::new(OrbitErrorCode::InvalidTenant, "tenant out of range"));
    }
    if fields.reserved != 0 {
        return Err(OrbitError::new(
            OrbitErrorCode::InvalidReserved,
            format!("reserved must be 0 on encode: {}", fields.reserved),
        ));
    }
    Ok((u128::from(fields.format_version) << FORMAT_VERSION_SHIFT)
        | (u128::from(fields.timestamp) << TIMESTAMP_SHIFT)
        | (u128::from(fields.r#type) << TYPE_SHIFT)
        | (u128::from(fields.node) << NODE_SHIFT)
        | (u128::from(fields.sequence) << SEQUENCE_SHIFT)
        | (u128::from(fields.region) << REGION_SHIFT)
        | (u128::from(fields.tenant) << TENANT_SHIFT))
}

pub fn decode(id: u128) -> Result<OrbitFields, OrbitError> {
    let format_version = ((id >> FORMAT_VERSION_SHIFT) & FORMAT_VERSION_MASK) as u8;
    if format_version != ISSUED_FORMAT_VERSION {
        return Err(OrbitError::new(
            OrbitErrorCode::InvalidFormatVersion,
            format!("unknown or reserved formatVersion: {format_version}"),
        ));
    }
    let reserved = (id & RESERVED_MASK) as u8;
    if reserved != 0 {
        return Err(OrbitError::new(
            OrbitErrorCode::InvalidReserved,
            format!("non-zero reserved is rejected in alpha: {reserved}"),
        ));
    }
    Ok(OrbitFields {
        format_version,
        timestamp: ((id >> TIMESTAMP_SHIFT) & TIMESTAMP_MASK) as u64,
        r#type: ((id >> TYPE_SHIFT) & TYPE_MASK) as u16,
        node: ((id >> NODE_SHIFT) & NODE_MASK) as u16,
        sequence: ((id >> SEQUENCE_SHIFT) & SEQUENCE_MASK) as u16,
        region: ((id >> REGION_SHIFT) & REGION_MASK) as u8,
        tenant: ((id >> TENANT_SHIFT) & TENANT_MASK) as u16,
        reserved,
    })
}

pub fn parse(input: &str) -> Result<OrbitFields, OrbitError> {
    decode(from_decimal_string(input)?)
}

pub fn from_decimal_string(input: &str) -> Result<u128, OrbitError> {
    if input.is_empty() {
        return Err(OrbitError::new(OrbitErrorCode::InvalidDecimal, "empty decimal string"));
    }
    if !input.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(OrbitError::new(OrbitErrorCode::InvalidDecimal, "non-canonical decimal string"));
    }
    if input.len() > 1 && input.starts_with('0') {
        return Err(OrbitError::new(OrbitErrorCode::InvalidDecimal, "leading zeros are not canonical"));
    }
    input.parse::<u128>().map_err(|_| {
        OrbitError::new(OrbitErrorCode::InvalidDecimal, "decimal value outside unsigned 128-bit range")
    })
}

pub fn to_decimal_string(id: u128) -> String {
    id.to_string()
}

pub fn to_hex_string(id: u128) -> String {
    format!("0x{id:032x}")
}

pub fn is_valid(input: &str) -> bool {
    parse(input).is_ok()
}

pub fn is_valid_id(id: u128) -> bool {
    decode(id).is_ok()
}

pub fn get_format_version(id: u128) -> Result<u8, OrbitError> {
    Ok(decode(id)?.format_version)
}

pub fn get_timestamp(id: u128) -> Result<u64, OrbitError> {
    Ok(decode(id)?.timestamp)
}

pub fn get_type(id: u128) -> Result<u16, OrbitError> {
    Ok(decode(id)?.r#type)
}

pub fn get_node(id: u128) -> Result<u16, OrbitError> {
    Ok(decode(id)?.node)
}

pub fn get_sequence(id: u128) -> Result<u16, OrbitError> {
    Ok(decode(id)?.sequence)
}

pub fn get_region(id: u128) -> Result<u8, OrbitError> {
    Ok(decode(id)?.region)
}

pub fn get_tenant(id: u128) -> Result<u16, OrbitError> {
    Ok(decode(id)?.tenant)
}

pub fn get_reserved(id: u128) -> Result<u8, OrbitError> {
    Ok(decode(id)?.reserved)
}

pub const fn to_unix_time_ms(timestamp: u64) -> u64 {
    timestamp + ORBIT_EPOCH_UNIX_MS
}

pub fn from_unix_time_ms(unix_ms: u64) -> Result<u64, OrbitError> {
    unix_ms.checked_sub(ORBIT_EPOCH_UNIX_MS).ok_or_else(|| {
        OrbitError::new(OrbitErrorCode::InvalidTimestamp, "time precedes Orbit epoch")
    })
}

pub struct GeneratorOptions {
    pub node: u16,
    pub region: u8,
    pub tenant: u16,
    pub clock: Arc<dyn OrbitClock>,
    pub clock_rollback_tolerance_ms: u64,
    pub on_sequence_exhausted: SequenceExhaustedMode,
    pub confirm_ownership: Option<Arc<dyn Fn() -> bool + Send + Sync>>,
}

impl GeneratorOptions {
    pub fn new(node: u16) -> Self {
        Self {
            node,
            region: 0,
            tenant: 0,
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

/// Thread-safe synchronous Orbit ID v2 generator.
pub struct OrbitGenerator {
    node: u16,
    region: u8,
    tenant: u16,
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
        if options.region > MAX_REGION {
            return Err(OrbitError::new(OrbitErrorCode::InvalidRegion, "region out of range"));
        }
        if options.tenant > MAX_TENANT {
            return Err(OrbitError::new(OrbitErrorCode::InvalidTenant, "tenant out of range"));
        }
        Ok(Self {
            node: options.node,
            region: options.region,
            tenant: options.tenant,
            clock: options.clock,
            clock_rollback_tolerance_ms: options.clock_rollback_tolerance_ms,
            on_sequence_exhausted: options.on_sequence_exhausted,
            confirm_ownership: options.confirm_ownership,
            state: Mutex::new(GeneratorState {
                last_timestamp: None,
                sequence: 0,
            }),
        })
    }

    pub const fn node(&self) -> u16 {
        self.node
    }

    pub const fn region(&self) -> u8 {
        self.region
    }

    pub const fn tenant(&self) -> u16 {
        self.tenant
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
        *self.lock_state() = GeneratorState {
            last_timestamp: Some(last_timestamp),
            sequence,
        };
        Ok(())
    }

    pub fn decide(&self, r#type: u16) -> GenerateDecision {
        self.decide_at(r#type, self.clock.current_orbit_timestamp_ms())
    }

    pub fn decide_at(&self, r#type: u16, now_timestamp: i64) -> GenerateDecision {
        self.decide_with_state(r#type, now_timestamp, *self.lock_state())
    }

    pub fn generate(&self, r#type: u16) -> Result<u128, OrbitError> {
        let mut state = self.lock_state();
        loop {
            let decision =
                self.decide_with_state(r#type, self.clock.current_orbit_timestamp_ms(), *state);
            match decision {
                GenerateDecision::Issue { timestamp, sequence } => {
                    let id = encode(OrbitFields {
                        format_version: ISSUED_FORMAT_VERSION,
                        timestamp,
                        r#type,
                        node: self.node,
                        sequence,
                        region: self.region,
                        tenant: self.tenant,
                        reserved: 0,
                    })?;
                    *state = GeneratorState {
                        last_timestamp: Some(timestamp),
                        sequence,
                    };
                    return Ok(id);
                }
                GenerateDecision::Wait { wait_until_timestamp } => {
                    self.wait_until(|timestamp| {
                        u64::try_from(timestamp)
                            .map(|t| t >= wait_until_timestamp)
                            .unwrap_or(false)
                    })?;
                }
                GenerateDecision::WaitNextMs { from_timestamp } => {
                    self.wait_until(|timestamp| {
                        u64::try_from(timestamp)
                            .map(|t| t > from_timestamp)
                            .unwrap_or(false)
                    })?;
                }
                GenerateDecision::Error { error } => {
                    return Err(OrbitError::new(error, format!("generate failed: {error}")));
                }
            }
        }
    }

    fn decide_with_state(
        &self,
        r#type: u16,
        now_timestamp: i64,
        state: GeneratorState,
    ) -> GenerateDecision {
        if self.confirm_ownership.as_ref().is_some_and(|confirm| !confirm()) {
            return GenerateDecision::Error {
                error: OrbitErrorCode::NodeOwnershipLost,
            };
        }
        if r#type == 0 || r#type > MAX_TYPE {
            return GenerateDecision::Error {
                error: OrbitErrorCode::InvalidType,
            };
        }
        let Ok(now) = u64::try_from(now_timestamp) else {
            return GenerateDecision::Error {
                error: OrbitErrorCode::InvalidTimestamp,
            };
        };
        if now > MAX_TIMESTAMP {
            return GenerateDecision::Error {
                error: OrbitErrorCode::InvalidTimestamp,
            };
        }
        let Some(last_timestamp) = state.last_timestamp else {
            return GenerateDecision::Issue {
                timestamp: now,
                sequence: 0,
            };
        };
        if now < last_timestamp {
            if last_timestamp - now <= self.clock_rollback_tolerance_ms {
                return GenerateDecision::Wait {
                    wait_until_timestamp: last_timestamp,
                };
            }
            return GenerateDecision::Error {
                error: OrbitErrorCode::ClockRollback,
            };
        }
        if now == last_timestamp {
            if state.sequence >= MAX_SEQUENCE {
                return match self.on_sequence_exhausted {
                    SequenceExhaustedMode::Wait => GenerateDecision::WaitNextMs {
                        from_timestamp: last_timestamp,
                    },
                    SequenceExhaustedMode::Fail => GenerateDecision::Error {
                        error: OrbitErrorCode::SequenceExhausted,
                    },
                };
            }
            return GenerateDecision::Issue {
                timestamp: now,
                sequence: state.sequence + 1,
            };
        }
        GenerateDecision::Issue {
            timestamp: now,
            sequence: 0,
        }
    }

    fn wait_until(&self, predicate: impl Fn(i64) -> bool) -> Result<(), OrbitError> {
        let started = Instant::now();
        while !predicate(self.clock.current_orbit_timestamp_ms()) {
            if started.elapsed() > Duration::from_secs(30) {
                return Err(OrbitError::new(
                    OrbitErrorCode::ClockRollback,
                    "timed out waiting for clock to advance",
                ));
            }
            thread::yield_now();
        }
        Ok(())
    }

    fn lock_state(&self) -> std::sync::MutexGuard<'_, GeneratorState> {
        self.state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}
