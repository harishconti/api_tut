import pytest
from unittest.mock import patch, MagicMock

# --- Mock for google.auth.default ---
# This is the function that raises DefaultCredentialsError
mock_google_auth_default_credentials = MagicMock(return_value=(None, None)) # Returns (credentials, project_id)

# --- Mock for google.cloud.sql.connector.Connector ---
# Create a mock for the Connector class
MockConnectorClass = MagicMock(name="MockConnectorClass")

# Configure the mock instance that Connector() will produce
mock_connector_instance = MagicMock(name="MockConnectorInstance")
mock_connector_instance.connect = MagicMock(
    name="MockConnectMethod",
    return_value="dummy_connection_object"
)
MockConnectorClass.return_value = mock_connector_instance


@pytest.fixture(scope="session", autouse=True)
def auto_mock_google_services_session():
    """
    Autouse session-scoped fixture to mock Google services that might
    be initialized at import time or require credentials.
    """
    # Patch google.auth.default first, as it's called by Connector's init
    patcher_google_auth = patch(
        'google.auth.default',
        mock_google_auth_default_credentials
    )

    # Patch the Connector class
    patcher_connector = patch(
        'google.cloud.sql.connector.Connector',
        MockConnectorClass
    )

    # Start patches
    patcher_google_auth.start()
    patcher_connector.start()

    yield  # Tests run here

    # Stop patches in reverse order
    patcher_connector.stop()
    patcher_google_auth.stop()
