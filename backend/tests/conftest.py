import pytest
from unittest.mock import patch, MagicMock

# All Google Cloud related mocks are removed as the associated services are no longer used.

@pytest.fixture(scope="session", autouse=True)
def auto_mock_google_services_session():
    """
    Autouse session-scoped fixture. Currently does nothing, but provides a
    placeholder if any session-wide mocks are needed in the future.
    """
    # print("Auto-mocking session fixture executing (currently no active mocks).")
    yield
    # print("Auto-mocking session fixture tearing down.")

# Example of how it was used, for reference:
# # --- Mock for google.auth.default ---
# # This is the function that raises DefaultCredentialsError
# mock_google_auth_default_credentials = MagicMock(return_value=(None, None)) # Returns (credentials, project_id)

# @pytest.fixture(scope="session", autouse=True)
# def auto_mock_google_services_session():
#     """
#     Autouse session-scoped fixture to mock Google services that might
#     be initialized at import time or require credentials.
#     """
#     # Patch google.auth.default, as it might be called by some libraries
#     # if they try to find default credentials.
#     patcher_google_auth = patch(
#         'google.auth.default',
#         mock_google_auth_default_credentials
#     )
#     patcher_google_auth.start()
#     yield  # Tests run here
#     patcher_google_auth.stop()
