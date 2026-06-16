use super::error::{DatabaseError, DatabaseResult};
use serde::Deserialize;
use serde_json::Value;
use sqlx::{query::Query, sqlite::SqliteArguments, Sqlite};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum WorkspaceStatementKind {
    DeleteTimelineEvents,
    DeleteFiles,
    DeleteReferences,
    DeleteTasks,
    DeleteNotes,
    DeleteSessions,
    DeleteProjects,
    InsertProject,
    InsertSession,
    InsertNote,
    InsertTask,
    InsertReference,
    InsertFile,
    InsertTimelineEvent,
}

#[derive(Debug, Deserialize)]
pub(crate) struct SqliteStatement {
    kind: WorkspaceStatementKind,
    #[serde(default)]
    values: Vec<Value>,
}

struct WorkspaceStatementSpec {
    bind_count: usize,
    query: &'static str,
}

impl SqliteStatement {
    pub(crate) fn into_query(
        self,
    ) -> DatabaseResult<Query<'static, Sqlite, SqliteArguments<'static>>> {
        validate_workspace_statement(&self)?;
        let statement_spec = get_workspace_statement_spec(self.kind);

        self.values
            .into_iter()
            .try_fold(sqlx::query(statement_spec.query), bind_sqlite_value)
    }
}

fn validate_workspace_statement(statement: &SqliteStatement) -> DatabaseResult<()> {
    let statement_spec = get_workspace_statement_spec(statement.kind);

    if statement.values.len() != statement_spec.bind_count {
        return Err(DatabaseError::InvalidBindCount {
            expected: statement_spec.bind_count,
        });
    }

    Ok(())
}

fn get_workspace_statement_spec(kind: WorkspaceStatementKind) -> WorkspaceStatementSpec {
    match kind {
        WorkspaceStatementKind::DeleteTimelineEvents => WorkspaceStatementSpec {
            bind_count: 0,
            query: "DELETE FROM timeline_events",
        },
        WorkspaceStatementKind::DeleteFiles => WorkspaceStatementSpec {
            bind_count: 0,
            query: "DELETE FROM files",
        },
        WorkspaceStatementKind::DeleteReferences => WorkspaceStatementSpec {
            bind_count: 0,
            query: "DELETE FROM references_store",
        },
        WorkspaceStatementKind::DeleteTasks => WorkspaceStatementSpec {
            bind_count: 0,
            query: "DELETE FROM tasks",
        },
        WorkspaceStatementKind::DeleteNotes => WorkspaceStatementSpec {
            bind_count: 0,
            query: "DELETE FROM notes",
        },
        WorkspaceStatementKind::DeleteSessions => WorkspaceStatementSpec {
            bind_count: 0,
            query: "DELETE FROM work_sessions",
        },
        WorkspaceStatementKind::DeleteProjects => WorkspaceStatementSpec {
            bind_count: 0,
            query: "DELETE FROM projects",
        },
        WorkspaceStatementKind::InsertProject => WorkspaceStatementSpec {
            bind_count: 10,
            query: "INSERT INTO projects (id, title, description, created_at, updated_at, tags_json, status, is_pinned, accent, icon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        },
        WorkspaceStatementKind::InsertSession => WorkspaceStatementSpec {
            bind_count: 7,
            query: "INSERT INTO work_sessions (id, project_id, title, notes, started_at, ended_at, duration_minutes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        },
        WorkspaceStatementKind::InsertNote => WorkspaceStatementSpec {
            bind_count: 7,
            query: "INSERT INTO notes (id, project_id, title, folder, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        },
        WorkspaceStatementKind::InsertTask => WorkspaceStatementSpec {
            bind_count: 10,
            query: "INSERT INTO tasks (id, project_id, title, status, priority, due_date, tags_json, linked_session_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        },
        WorkspaceStatementKind::InsertReference => WorkspaceStatementSpec {
            bind_count: 8,
            query: "INSERT INTO references_store (id, project_id, title, type, source, summary, tags_json, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        },
        WorkspaceStatementKind::InsertFile => WorkspaceStatementSpec {
            bind_count: 10,
            query: "INSERT INTO files (id, project_id, name, file_type, size_label, path, source_path, storage_mode, tags_json, imported_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        },
        WorkspaceStatementKind::InsertTimelineEvent => WorkspaceStatementSpec {
            bind_count: 6,
            query: "INSERT INTO timeline_events (id, project_id, type, title, description, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
        },
    }
}

fn bind_sqlite_value<'query>(
    query: Query<'query, Sqlite, SqliteArguments<'query>>,
    value: Value,
) -> DatabaseResult<Query<'query, Sqlite, SqliteArguments<'query>>> {
    Ok(match value {
        Value::Null => query.bind(Option::<String>::None),
        Value::Bool(value) => query.bind(value),
        Value::Number(value) => {
            if let Some(integer) = value.as_i64() {
                query.bind(integer)
            } else if let Some(unsigned_integer) = value.as_u64() {
                if unsigned_integer > i64::MAX as u64 {
                    return Err(DatabaseError::IntegerOutOfRange);
                }

                query.bind(unsigned_integer as i64)
            } else if let Some(float) = value.as_f64() {
                query.bind(float)
            } else {
                return Err(DatabaseError::UnsupportedNumber);
            }
        }
        Value::String(value) => query.bind(value),
        Value::Array(_) | Value::Object(_) => query.bind(value.to_string()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Number};

    fn create_statement(kind: WorkspaceStatementKind, values: Vec<Value>) -> SqliteStatement {
        SqliteStatement { kind, values }
    }

    fn create_string_values(count: usize) -> Vec<Value> {
        (0..count)
            .map(|index| Value::String(format!("value-{index}")))
            .collect()
    }

    #[test]
    fn workspace_statement_kind_rejects_unknown_payloads() {
        let statement = serde_json::from_value::<SqliteStatement>(json!({
            "kind": "update_project",
            "values": ["title", "project-id"]
        }));

        assert!(statement.is_err());
    }

    #[test]
    fn selects_workspace_statement_spec_from_kind() {
        let statement_spec = get_workspace_statement_spec(WorkspaceStatementKind::InsertFile);

        assert_eq!(statement_spec.bind_count, 10);
        assert_eq!(
            statement_spec.query,
            "INSERT INTO files (id, project_id, name, file_type, size_label, path, source_path, storage_mode, tags_json, imported_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
        );
    }

    #[test]
    fn validate_workspace_statement_accepts_known_delete_statements() {
        let valid_statement = create_statement(WorkspaceStatementKind::DeleteFiles, vec![]);

        assert!(validate_workspace_statement(&valid_statement).is_ok());
    }

    #[test]
    fn validate_workspace_statement_rejects_invalid_bind_counts() {
        let rejected_statement = create_statement(
            WorkspaceStatementKind::InsertProject,
            create_string_values(9),
        );

        assert_eq!(
            validate_workspace_statement(&rejected_statement).map_err(|error| error.to_string()),
            Err("FlowDesk expected 10 bind values for a workspace database statement.".into())
        );
    }

    #[test]
    fn validate_workspace_statement_accepts_known_insert_statements_with_exact_binds() {
        let valid_statement = create_statement(
            WorkspaceStatementKind::InsertTimelineEvent,
            create_string_values(6),
        );

        assert!(validate_workspace_statement(&valid_statement).is_ok());
    }

    #[test]
    fn bind_sqlite_value_rejects_unsigned_integers_outside_sqlite_range() {
        let query = sqlx::query("SELECT ?");
        let oversized_value = Value::Number(Number::from(u64::MAX));

        assert_eq!(
            bind_sqlite_value(query, oversized_value)
                .map(|_| ())
                .map_err(|error| error.to_string()),
            Err("SQLite integer bind value is out of range.".into())
        );
    }
}
