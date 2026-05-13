"""
WebSocket consumers for real-time AI Agent chatting.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async

from .services import get_ai_response

class AIAgentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        Handles incoming WebSocket connection.
        """
        self.user_role = "farmer" # Default role
        self.history = [] # To store conversation history for the session
        
        # Accept the connection
        await self.accept()

        # Send a welcome message
        await self.send(text_data=json.dumps({
            'message': 'Connected to SMC Copilot.',
            'type': 'system'
        }))

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        """
        Receives a message from the WebSocket.
        Expected JSON format: {"message": "Hello", "role": "farmer"}
        """
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json.get('message', '')
            role = text_data_json.get('role', 'farmer')
            first_name = text_data_json.get('first_name', 'Farmer')
            user_id = text_data_json.get('user_id')
            
            # Send an immediate acknowledgement/typing indicator
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'status': 'processing'
            }))
            
            # Execute Gemini AI processing with context history
            ai_reply = await sync_to_async(get_ai_response)(role, message, self.history, first_name=first_name, user_id=user_id)
            
            # Append the successful turn to history
            self.history.append({"role": "user", "parts": [{"text": message}]})
            self.history.append({"role": "model", "parts": [{"text": ai_reply}]})
            
            # Cap history to prevent payload bloating (e.g., last 10 messages = 5 turns)
            if len(self.history) > 10:
                self.history = self.history[-10:]
            
            # Send the AI response back
            await self.send(text_data=json.dumps({
                'type': 'message',
                'message': ai_reply,
                'sender': 'ai'
            }))
            
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Server Error: {str(e)}'
            }))
