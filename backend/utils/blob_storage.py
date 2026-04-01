import os
import uuid
import hashlib
import io
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, BinaryIO, Union
from azure.storage.blob import BlobServiceClient, ContentSettings, BlobProperties
from azure.core.exceptions import ResourceNotFoundError
import logging
from fastapi import HTTPException, UploadFile
import urllib.parse
from dotenv import load_dotenv

load_dotenv()


logger = logging.getLogger(__name__)

# Azure Blob Storage configuration
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER", "media")

# if not AZURE_STORAGE_CONNECTION_STRING:
#     raise Exception("AZURE_STORAGE_CONNECTION_STRING not found in environment")

# Initialize Blob Service Client
blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)

# Ensure container exists
try:
    container_client = blob_service_client.get_container_client(AZURE_STORAGE_CONTAINER)
    container_client.create_container()
except Exception as e:
    logger.info(f"Container may already exist: {e}")
    


class AzureBlobStorage:
    """
    Azure Blob Storage manager for files and images
    """
    
    # Cache control settings
    CACHE_MAX_AGE = 31536000  # 1 year
    CDN_URL = os.getenv("AZURE_CDN_URL")  # Optional CDN URL
    
    @staticmethod
    def get_blob_client(blob_name: str):
        """Get blob client for a specific blob"""
        return blob_service_client.get_blob_client(
            container=AZURE_STORAGE_CONTAINER,
            blob=blob_name
        )
    
    @staticmethod
    def generate_blob_name(original_filename: str, prefix: str = "") -> str:
        """
        Generate a unique blob name
        """
        # Get file extension
        extension = ""
        if original_filename and '.' in original_filename:
            extension = original_filename.split('.')[-1].lower()
        
        # Generate unique ID
        unique_id = str(uuid.uuid4())
        
        # Create blob name
        if prefix:
            blob_name = f"{prefix}/{unique_id}"
        else:
            blob_name = unique_id
        
        # Add extension if exists
        if extension:
            blob_name = f"{blob_name}.{extension}"
        
        return blob_name
    
    @staticmethod
    def get_public_url(blob_name: str) -> str:
        """
        Get public URL for a blob (with optional CDN)
        """
        if AzureBlobStorage.CDN_URL:
            return f"{AzureBlobStorage.CDN_URL}/{blob_name}"
        else:
            # Return blob URL without SAS token for public container
            return f"https://{blob_service_client.account_name}.blob.core.windows.net/{AZURE_STORAGE_CONTAINER}/{blob_name}"
    
    @staticmethod
    def upload_file(
        file_data: Union[bytes, BinaryIO, UploadFile],
        blob_name: str = None,
        content_type: str = None,
        metadata: Dict[str, str] = None,
        original_filename: str = None
    ) -> Dict[str, Any]:
        """
        Upload a file to Azure Blob Storage
        
        Args:
            file_data: File data (bytes, file-like object, or UploadFile)
            blob_name: Optional custom blob name (generated if not provided)
            content_type: MIME type of the file
            metadata: Optional metadata dictionary
            original_filename: Original filename for reference
        
        Returns:
            Dictionary with blob info
        """
        try:
            # Handle UploadFile
            if isinstance(file_data, UploadFile):
                content = file_data.file.read()
                if not content_type:
                    content_type = file_data.content_type
                if not original_filename:
                    original_filename = file_data.filename
            elif isinstance(file_data, bytes):
                content = file_data
            else:
                content = file_data.read()
            
            # Generate blob name if not provided
            if not blob_name:
                blob_name = AzureBlobStorage.generate_blob_name(
                    original_filename or "file",
                    prefix="uploads"
                )
            
            # Prepare content settings
            content_settings = ContentSettings(
                content_type=content_type or "application/octet-stream",
                cache_control=f"public, max-age={AzureBlobStorage.CACHE_MAX_AGE}"
            )
            
            # Prepare metadata
            blob_metadata = metadata or {}
            if original_filename:
                blob_metadata["original_filename"] = original_filename
            blob_metadata["uploaded_at"] = datetime.utcnow().isoformat()
            
            # Upload to Azure
            blob_client = AzureBlobStorage.get_blob_client(blob_name)
            blob_client.upload_blob(
                content,
                content_settings=content_settings,
                metadata=blob_metadata,
                overwrite=False
            )
            
            # Get blob properties
            blob_properties = blob_client.get_blob_properties()
            
            return {
                "blob_name": blob_name,
                "url": AzureBlobStorage.get_public_url(blob_name),
                "content_type": blob_properties.content_settings.content_type,
                "size": blob_properties.size,
                "metadata": blob_properties.metadata,
                "etag": blob_properties.etag,
                "last_modified": blob_properties.last_modified.isoformat() if blob_properties.last_modified else None
            }
            
        except Exception as e:
            logger.error(f"Failed to upload file to Azure Blob Storage: {str(e)}")
            raise HTTPException(status_code=500, detail="File upload failed")
    
    @staticmethod
    def download_file(blob_name: str) -> bytes:
        """
        Download a file from Azure Blob Storage
        
        Args:
            blob_name: Name of the blob
        
        Returns:
            File data as bytes
        """
        try:
            blob_client = AzureBlobStorage.get_blob_client(blob_name)
            download_stream = blob_client.download_blob()
            return download_stream.readall()
            
        except ResourceNotFoundError:
            logger.error(f"Blob not found: {blob_name}")
            raise HTTPException(status_code=404, detail="File not found")
        except Exception as e:
            logger.error(f"Failed to download file from Azure Blob Storage: {str(e)}")
            raise HTTPException(status_code=500, detail="File download failed")
    
    @staticmethod
    def get_blob_properties(blob_name: str) -> BlobProperties:
        """
        Get blob properties
        
        Args:
            blob_name: Name of the blob
        
        Returns:
            BlobProperties object
        """
        try:
            blob_client = AzureBlobStorage.get_blob_client(blob_name)
            return blob_client.get_blob_properties()
            
        except ResourceNotFoundError:
            return None
        except Exception as e:
            logger.error(f"Failed to get blob properties: {str(e)}")
            return None
    
    @staticmethod
    def delete_file(blob_name: str) -> bool:
        """
        Delete a file from Azure Blob Storage
        
        Args:
            blob_name: Name of the blob
        
        Returns:
            True if successful
        """
        try:
            blob_client = AzureBlobStorage.get_blob_client(blob_name)
            blob_client.delete_blob()
            return True
            
        except ResourceNotFoundError:
            return False
        except Exception as e:
            logger.error(f"Failed to delete blob: {str(e)}")
            return False
    
    @staticmethod
    def generate_sas_url(blob_name: str, expiry_hours: int = 1) -> Optional[str]:
        """
        Generate a SAS URL for temporary access (for private blobs)
        
        Args:
            blob_name: Name of the blob
            expiry_hours: Expiry time in hours
        
        Returns:
            SAS URL or None if failed
        """
        try:
            from azure.storage.blob import generate_blob_sas, BlobSasPermissions
            from datetime import datetime, timedelta
            
            blob_client = AzureBlobStorage.get_blob_client(blob_name)
            
            # Generate SAS token
            sas_token = generate_blob_sas(
                account_name=blob_service_client.account_name,
                container_name=AZURE_STORAGE_CONTAINER,
                blob_name=blob_name,
                account_key=blob_service_client.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(hours=expiry_hours)
            )
            
            # Return full URL
            return f"{blob_client.url}?{sas_token}"
            
        except Exception as e:
            logger.error(f"Failed to generate SAS URL: {str(e)}")
            return None
    
    @staticmethod
    def list_files(prefix: str = None, max_results: int = 100) -> list:
        """
        List files in the container
        
        Args:
            prefix: Optional prefix filter
            max_results: Maximum number of results
        
        Returns:
            List of blob properties
        """
        try:
            container_client = blob_service_client.get_container_client(AZURE_STORAGE_CONTAINER)
            blobs = container_client.list_blobs(name_starts_with=prefix)
            
            results = []
            for i, blob in enumerate(blobs):
                if i >= max_results:
                    break
                
                # Get blob client for additional properties
                blob_client = AzureBlobStorage.get_blob_client(blob.name)
                properties = blob_client.get_blob_properties()
                
                results.append({
                    "blob_name": blob.name,
                    "url": AzureBlobStorage.get_public_url(blob.name),
                    "size": blob.size,
                    "content_type": blob.content_settings.content_type if blob.content_settings else None,
                    "metadata": properties.metadata,
                    "last_modified": blob.last_modified.isoformat() if blob.last_modified else None,
                    "etag": blob.etag
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to list blobs: {str(e)}")
            return []
        
