use std::{fmt, io, time::SystemTimeError};

pub(crate) type DatabaseResult<T> = Result<T, DatabaseError>;

#[derive(Debug)]
pub(crate) enum DatabaseError {
    EmptyDatabasePath,
    InvalidDatabaseUrl,
    MissingDatabaseDirectory,
    MissingDatabaseFileName,
    InvalidBindCount { expected: usize },
    IntegerOutOfRange,
    UnsupportedNumber,
    Io(io::Error),
    Sqlx(sqlx::Error),
    SystemTime(SystemTimeError),
    TauriPath(tauri::Error),
}

impl fmt::Display for DatabaseError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyDatabasePath => {
                formatter.write_str("FlowDesk expected a sqlite database file path.")
            }
            Self::InvalidDatabaseUrl => {
                formatter.write_str("FlowDesk expected a sqlite database URL.")
            }
            Self::MissingDatabaseDirectory => {
                formatter.write_str("FlowDesk could not resolve the database directory.")
            }
            Self::MissingDatabaseFileName => {
                formatter.write_str("FlowDesk could not resolve a database file name.")
            }
            Self::InvalidBindCount { expected } => write!(
                formatter,
                "FlowDesk expected {expected} bind values for a workspace database statement."
            ),
            Self::IntegerOutOfRange => {
                formatter.write_str("SQLite integer bind value is out of range.")
            }
            Self::UnsupportedNumber => {
                formatter.write_str("Unsupported SQLite numeric bind value.")
            }
            Self::Io(error) => error.fmt(formatter),
            Self::Sqlx(error) => error.fmt(formatter),
            Self::SystemTime(error) => error.fmt(formatter),
            Self::TauriPath(error) => error.fmt(formatter),
        }
    }
}

impl From<io::Error> for DatabaseError {
    fn from(error: io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<sqlx::Error> for DatabaseError {
    fn from(error: sqlx::Error) -> Self {
        Self::Sqlx(error)
    }
}

impl From<SystemTimeError> for DatabaseError {
    fn from(error: SystemTimeError) -> Self {
        Self::SystemTime(error)
    }
}

impl From<tauri::Error> for DatabaseError {
    fn from(error: tauri::Error) -> Self {
        Self::TauriPath(error)
    }
}
